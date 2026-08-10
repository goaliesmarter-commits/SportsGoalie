import { BaseDatabaseService } from '../base.service';
import {
  DynamicStudentAnalytics,
  DynamicChartingEntry,
  FormTemplate,
  FormField,
  FieldAnalyticsResult,
  CategoryAnalyticsResult,
  AnalyticsType,
  TrendDirection,
  ApiResponse,
  AnalyticsQueryOptions,
} from '@/types';
import {
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logger } from '../../utils/logger';
import { toDateSafe } from '../../utils/timestamp';
import { scaleToPercentage } from '../../scoring/scale-score';
import { formTemplateService } from './form-template.service';
import { dynamicChartingService } from './dynamic-charting.service';

/**
 * Milliseconds for any date-shaped value Firestore may hand back, `null` when
 * there's nothing usable.
 *
 * Every timestamp read in this service goes through here rather than calling
 * `.toMillis()` / `.toDate()` directly. Entries written before the
 * `removeUndefinedFields` fix hold `submittedAt` as a plain `{ seconds,
 * nanoseconds }` map with no methods on it, so a direct call throws
 * `toMillis is not a function` and takes the whole analytics calculation down —
 * which is exactly how a single legacy entry could blank a student's board.
 */
function millisOf(value: unknown): number | null {
  return toDateSafe(value)?.getTime() ?? null;
}

/**
 * Sort comparator over entry timestamps, tolerant of the mangled shape above.
 * Undatable entries sort last in both directions rather than poisoning the
 * comparison with NaN.
 */
function compareBySubmittedAt(
  a: { submittedAt: unknown },
  b: { submittedAt: unknown },
  direction: 'asc' | 'desc'
): number {
  const aMs = millisOf(a.submittedAt);
  const bMs = millisOf(b.submittedAt);

  if (aMs === null && bMs === null) return 0;
  if (aMs === null) return 1;
  if (bMs === null) return -1;

  return direction === 'asc' ? aMs - bMs : bMs - aMs;
}

/**
 * Flattens a thrown value into something loggable.
 *
 * FirebaseError puts the useful part on `code` (`permission-denied`,
 * `failed-precondition` for a missing composite index) and, for a missing index,
 * the console URL that creates it inside `message` — neither of which survives a
 * bare `String(error)`.
 */
function describeError(error: unknown): { code: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      code: (error as { code?: string }).code ?? error.name,
      message: error.message || '(no message)',
      stack: error.stack,
    };
  }

  if (error && typeof error === 'object') {
    const candidate = error as { code?: string; message?: string };
    return {
      code: candidate.code ?? 'unknown',
      message: candidate.message ?? JSON.stringify(error),
    };
  }

  return { code: 'unknown', message: String(error) };
}

/**
 * Service for calculating analytics from dynamic form responses
 * Supports multiple analytics types: percentage, average, sum, trend, distribution, etc.
 */
export class DynamicAnalyticsService extends BaseDatabaseService {
  private readonly ANALYTICS_COLLECTION = 'dynamic_charting_analytics';
  // 2: scores normalize against the field's configured scale instead of the
  //    observed range, and scale fields mis-typed as `percentage` are repaired.
  private readonly CALCULATION_VERSION = 2; // Increment when algorithm changes

  // ==================== MAIN ANALYTICS CALCULATION ====================

  /**
   * Recalculates all analytics for a student based on their entries
   */
  async recalculateStudentAnalytics(
    studentId: string,
    templateId: string,
    options: Omit<AnalyticsQueryOptions, 'studentId'> = {}
  ): Promise<ApiResponse<DynamicStudentAnalytics>> {
    logger.info('Recalculating student analytics', 'DynamicAnalyticsService', {
      studentId,
      templateId,
    });

    try {
      // Get template
      const templateResult = await formTemplateService.getTemplate(templateId);
      if (!templateResult.success || !templateResult.data) {
        return {
          success: false,
          message: 'Template not found',
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Form template does not exist',
          },
          timestamp: new Date(),
        };
      }

      const template = templateResult.data;

      // Get all entries for this student and template
      const entriesResult = await dynamicChartingService.getDynamicEntriesByStudent(
        studentId,
        templateId
      );

      if (!entriesResult.success || !entriesResult.data) {
        return {
          success: false,
          message: 'Failed to fetch entries',
          error: {
            code: 'ENTRIES_FETCH_ERROR',
            message: 'Could not retrieve student entries',
          },
          timestamp: new Date(),
        };
      }

      // Filter by completion if specified. This applies to the full history too,
      // since a baseline should never be pinned to a partial/incomplete entry.
      let allEntries = entriesResult.data;
      if (!options.includePartialEntries) {
        allEntries = allEntries.filter((e) => e.isComplete);
      }

      // The baseline always anchors to the full, unfiltered history — only the
      // "current" side of the calculation respects a date window. Otherwise
      // picking anything but All-Time would silently exclude the baseline entry.
      const hasDateFilter = Boolean(options.dateFrom || options.dateTo);
      const windowedEntries = hasDateFilter
        ? this.filterEntriesByDate(allEntries, options.dateFrom, options.dateTo)
        : allEntries;

      const analytics = await this.calculateAnalytics(studentId, template, allEntries, windowedEntries);

      // Only persist the canonical (full-history) calculation. A date-filtered
      // result must never overwrite the cached ${studentId}_${templateId} doc
      // that other consumers read from.
      if (!hasDateFilter) {
        const analyticsId = `${studentId}_${templateId}`;
        await this.createWithId(this.ANALYTICS_COLLECTION, analyticsId, analytics);
      }

      logger.info('Student analytics calculated successfully', 'DynamicAnalyticsService', {
        studentId,
        templateId,
        entriesAnalyzed: windowedEntries.length,
        persisted: !hasDateFilter,
      });

      return {
        success: true,
        data: analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      // Firestore rejections (permission-denied, failed-precondition/missing index)
      // carry their reason on `code` and, for a missing index, the URL to create it
      // in `message`. Logging only `error.message` on a bare object loses all of it,
      // which is how this surfaced as an unreadable `{}`.
      const detail = describeError(error);
      // Folded into the message rather than left in the data object: the Next.js
      // error overlay renders the data argument shallowly, so a reason left in there
      // is effectively invisible while debugging.
      logger.error(
        `Error calculating student analytics [${detail.code}] ${detail.message}`,
        'DynamicAnalyticsService',
        { studentId, templateId, ...detail }
      );
      return {
        success: false,
        message: 'Failed to calculate analytics',
        error: {
          code: detail.code ?? 'CALCULATION_ERROR',
          message: detail.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets analytics for a student. With no options, returns the cached doc
   * as before. Passing a date range (or recalculate: true) computes fresh
   * instead — without persisting — so a filtered dashboard view can't
   * clobber the canonical cached analytics other consumers rely on.
   */
  async getStudentAnalytics(
    studentId: string,
    templateId: string,
    options: Omit<AnalyticsQueryOptions, 'studentId'> = {}
  ): Promise<ApiResponse<DynamicStudentAnalytics | null>> {
    const hasDateFilter = Boolean(options.dateFrom || options.dateTo);

    if (!hasDateFilter && !options.recalculate) {
      const analyticsId = `${studentId}_${templateId}`;
      return await this.getById<DynamicStudentAnalytics>(this.ANALYTICS_COLLECTION, analyticsId);
    }

    return await this.recalculateStudentAnalytics(studentId, templateId, options);
  }

  /**
   * Gets the most recent analytics for a student (from any template)
   */
  async getLatestStudentAnalytics(
    studentId: string
  ): Promise<ApiResponse<DynamicStudentAnalytics>> {
    logger.database('query', this.ANALYTICS_COLLECTION, undefined, { studentId });

    try {
      const analyticsRef = collection(db, this.ANALYTICS_COLLECTION);
      const q = query(
        analyticsRef,
        where('studentId', '==', studentId),
        orderBy('lastCalculated', 'desc'),
        firestoreLimit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          success: false,
          message: 'No analytics found for student',
          error: {
            code: 'NOT_FOUND',
            message: 'No analytics records exist for this student',
          },
          timestamp: new Date(),
        };
      }

      const docData = snapshot.docs[0].data();
      const analytics = docData as unknown as DynamicStudentAnalytics;

      return {
        success: true,
        data: analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting latest student analytics', 'DynamicAnalyticsService', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        message: 'Failed to get analytics',
        error: {
          code: 'QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      };
    }
  }

  // ==================== ANALYTICS CALCULATION LOGIC ====================

  /**
   * Main analytics calculation function
   */
  private async calculateAnalytics(
    studentId: string,
    template: FormTemplate,
    allEntries: DynamicChartingEntry[],
    windowedEntries: DynamicChartingEntry[]
  ): Promise<Omit<DynamicStudentAnalytics, 'id' | 'createdAt' | 'updatedAt'>> {
    // Session stats
    const sessionStats = this.calculateSessionStats(windowedEntries);

    // Streak data
    const streak = this.calculateStreak(windowedEntries);

    // Field-level analytics
    const fieldAnalytics: { [fieldId: string]: FieldAnalyticsResult } = {};
    const categoryAnalytics: { [category: string]: CategoryAnalyticsResult } = {};

    // Process each section and field
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (field.analytics.enabled && field.analytics.type !== 'none') {
          const fieldResult = this.calculateFieldAnalytics(
            field,
            section.id,
            windowedEntries,
            allEntries,
            section.isRepeatable
          );

          if (fieldResult) {
            fieldAnalytics[field.id] = fieldResult;

            // Group by category
            if (field.analytics.category) {
              if (!categoryAnalytics[field.analytics.category]) {
                categoryAnalytics[field.analytics.category] = {
                  category: field.analytics.category,
                  fields: [],
                  fieldCount: 0,
                  overallScore: 0,
                  trend: 'stable',
                  fieldResults: [],
                  topPerformingFields: [],
                  needsImprovementFields: [],
                };
              }

              categoryAnalytics[field.analytics.category].fields.push(field.id);
              categoryAnalytics[field.analytics.category].fieldResults.push(fieldResult);
            }
          }
        }
      }
    }

    // Calculate category-level metrics
    for (const category in categoryAnalytics) {
      const categoryData = categoryAnalytics[category];
      categoryData.fieldCount = categoryData.fields.length;

      // Calculate overall score (average of all field scores)
      const scores = categoryData.fieldResults
        .map((fr) => this.getFieldScore(fr))
        .filter((s) => s !== null) as number[];

      if (scores.length > 0) {
        categoryData.overallScore =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }

      // Determine category trend (majority trend)
      const trends = categoryData.fieldResults
        .map((fr) => fr.percentageTrend || fr.averageTrend)
        .filter((t) => t !== undefined) as TrendDirection[];

      categoryData.trend = this.getMajorityTrend(trends);

      // Identify top and struggling fields
      const fieldScores = categoryData.fieldResults.map((fr, _idx) => ({
        fieldLabel: fr.fieldLabel,
        score: this.getFieldScore(fr) || 0,
      }));

      fieldScores.sort((a, b) => b.score - a.score);
      categoryData.topPerformingFields = fieldScores.slice(0, 3).map((f) => f.fieldLabel);
      categoryData.needsImprovementFields = fieldScores
        .slice(-3)
        .reverse()
        .map((f) => f.fieldLabel);

      // Baseline/current tracking: average each field's raw baseline/latest value
      // (not the normalized 0-100 score) so the category stays in the fields' own units.
      const baselineValues = categoryData.fieldResults
        .map((fr) => fr.baselineValue)
        .filter((v): v is number => v !== undefined);
      const latestValues = categoryData.fieldResults
        .map((fr) => fr.latestValue)
        .filter((v): v is number => v !== undefined);

      if (baselineValues.length > 0) {
        categoryData.baselineScore = this.round(
          baselineValues.reduce((sum, v) => sum + v, 0) / baselineValues.length,
          2
        );

        const baselineDates = categoryData.fieldResults
          .map((fr) => fr.baselineDate)
          .filter((d): d is Timestamp => d !== undefined);
        if (baselineDates.length > 0) {
          categoryData.baselineDate = baselineDates.reduce((earliest, d) => {
            const dMs = millisOf(d);
            const earliestMs = millisOf(earliest);
            if (dMs === null) return earliest;
            if (earliestMs === null) return d;
            return dMs < earliestMs ? d : earliest;
          });
        }
      }

      if (latestValues.length > 0) {
        categoryData.currentScore = this.round(
          latestValues.reduce((sum, v) => sum + v, 0) / latestValues.length,
          2
        );
      }

      if (categoryData.baselineScore !== undefined && categoryData.currentScore !== undefined) {
        categoryData.growthFromBaseline = this.round(
          categoryData.currentScore - categoryData.baselineScore,
          2
        );
      }
    }

    // Overall performance
    const allScores = Object.values(fieldAnalytics)
      .map((fa) => this.getFieldScore(fa))
      .filter((s) => s !== null) as number[];

    const overallPerformanceScore =
      allScores.length > 0 ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length : 0;

    // Overall trend
    const allTrends = Object.values(fieldAnalytics)
      .map((fa) => fa.percentageTrend || fa.averageTrend)
      .filter((t) => t !== undefined) as TrendDirection[];

    const overallTrend = this.getMajorityTrend(allTrends);

    // Top strengths and areas for improvement
    const fieldScores = Object.values(fieldAnalytics).map((fa) => ({
      label: fa.fieldLabel,
      score: this.getFieldScore(fa) || 0,
    }));

    fieldScores.sort((a, b) => b.score - a.score);
    const topStrengths = fieldScores.slice(0, 5).map((f) => f.label);
    const areasForImprovement = fieldScores
      .slice(-5)
      .reverse()
      .map((f) => f.label);

    return {
      studentId,
      formTemplateId: template.id,
      formTemplateName: template.name,
      pillar: template.pillar,
      sport: template.sport,
      totalEntries: allEntries.length,
      sessionStats,
      streak,
      fieldAnalytics,
      categoryAnalytics,
      overallPerformanceScore,
      overallTrend,
      topStrengths,
      areasForImprovement,
      lastCalculated: Timestamp.now(),
      calculationVersion: this.CALCULATION_VERSION,
    };
  }

  // ==================== FIELD ANALYTICS CALCULATION ====================

  /**
   * The analytics type to actually calculate for a field.
   *
   * The template builder stamped every analytics-enabled field as `percentage`
   * regardless of its input type. `percentage` counts boolean trues, so a 1-10
   * scale field scored a flat 0% however the athlete answered — every template
   * authored through the admin UI reported an overall score of 0. The builder
   * now picks the right type up front, but templates saved before that fix are
   * already in Firestore, so the mismatch is repaired here on read rather than
   * by migrating documents: a stored type that cannot produce a number from
   * this field's values gives way to the one that can.
   */
  private resolveAnalyticsType(field: FormField): AnalyticsType {
    const stored = field.analytics.type;

    if ((field.type === 'scale' || field.type === 'numeric') && stored === 'percentage') {
      return 'average';
    }

    if (
      (field.type === 'radio' || field.type === 'checkbox') &&
      (stored === 'percentage' || stored === 'average')
    ) {
      return 'distribution';
    }

    return stored;
  }

  /**
   * The bounds of the rating scale a field is answered on, or null when it has none.
   *
   * Scale fields fall back to 1-10 to match the input control (DynamicScaleField)
   * and the history page's progress bars — the builder didn't record explicit
   * bounds for them. A numeric field only counts as scaled when the author gave
   * it both ends: an open-ended tally like "shots faced" has no ceiling to
   * measure a percentage against.
   */
  private getConfiguredScale(field: FormField): { min: number; max: number } | null {
    if (field.type === 'scale') {
      return { min: field.validation?.min ?? 1, max: field.validation?.max ?? 10 };
    }

    if (
      field.type === 'numeric' &&
      field.validation?.min !== undefined &&
      field.validation?.max !== undefined
    ) {
      return { min: field.validation.min, max: field.validation.max };
    }

    return null;
  }

  /**
   * Calculates analytics for a single field
   */
  private calculateFieldAnalytics(
    field: FormField,
    sectionId: string,
    entries: DynamicChartingEntry[],
    allEntries: DynamicChartingEntry[],
    isRepeatable?: boolean
  ): FieldAnalyticsResult | null {
    // Extract values for this field from all entries
    const values = this.extractFieldValues(field.id, sectionId, entries, isRepeatable);

    if (values.length === 0) {
      return null;
    }

    const analyticsType = this.resolveAnalyticsType(field);

    const result: FieldAnalyticsResult = {
      fieldId: field.id,
      fieldLabel: field.analytics.displayName || field.label,
      fieldType: field.type,
      analyticsType,
      category: field.analytics.category,
      dataPoints: values.length,
    };

    // Carried onto the result so scoring can normalize against the scale the
    // athlete answered on without needing the template back.
    const scale = this.getConfiguredScale(field);
    if (scale) {
      result.scaleMin = scale.min;
      result.scaleMax = scale.max;
    }

    // Calculate based on analytics type
    switch (analyticsType) {
      case 'percentage':
        this.calculatePercentageAnalytics(result, values, field);
        break;

      case 'average':
        this.calculateAverageAnalytics(result, values, field);
        break;

      case 'sum':
        this.calculateSumAnalytics(result, values);
        break;

      case 'distribution':
        this.calculateDistributionAnalytics(result, values);
        break;

      case 'consistency':
        this.calculateConsistencyAnalytics(result, values);
        break;

      case 'trend':
        this.calculateTrendAnalytics(result, values, field);
        break;

      case 'count':
        this.calculateCountAnalytics(result, values);
        break;
    }

    // Baseline always anchors to the first-ever submission across full history,
    // independent of the active date window, so switching dashboard filters
    // can't move the anchor.
    const baseline = this.extractFieldEdgeValue(field.id, sectionId, allEntries, isRepeatable, 'first');
    if (baseline) {
      result.baselineValue = baseline.value;
      result.baselineDate = baseline.date;

      // Latest reflects the current window, so growth reflects progress made
      // within the selected period (Week/Month/3-Month/All-Time).
      const latest = this.extractFieldEdgeValue(field.id, sectionId, entries, isRepeatable, 'last');
      if (latest) {
        result.latestValue = latest.value;
        result.latestDate = latest.date;
        result.growthFromBaseline = this.round(latest.value - baseline.value, 2);
      }
    }

    // Target tracking
    if (field.analytics.targetValue !== undefined) {
      const currentValue = result.percentage || result.average || 0;
      result.targetValue = field.analytics.targetValue;
      result.targetProgress = Math.min(100, (currentValue / field.analytics.targetValue) * 100);
      result.isOnTarget = currentValue >= field.analytics.targetValue;
    }

    return result;
  }

  /**
   * Percentage analytics (for yes/no fields)
   */
  private calculatePercentageAnalytics(
    result: FieldAnalyticsResult,
    values: any[],
    field: FormField
  ): void {
    const trueValues = values.filter((v) => v === true || v === 'true').length;
    result.percentage = Math.round((trueValues / values.length) * 100);

    // Calculate trend (recent vs older)
    const recentCount = Math.min(5, values.length);
    const recentValues = values.slice(0, recentCount);
    const olderValues = values.slice(recentCount, recentCount * 2);

    if (olderValues.length > 0) {
      const recentPercent =
        (recentValues.filter((v) => v === true || v === 'true').length / recentValues.length) *
        100;
      const olderPercent =
        (olderValues.filter((v) => v === true || v === 'true').length / olderValues.length) * 100;

      const higherIsBetter = field.analytics.higherIsBetter !== false;
      result.percentageTrend = this.determineTrend(recentPercent, olderPercent, higherIsBetter);
    }
  }

  /**
   * Average analytics (for numeric/scale fields)
   */
  private calculateAverageAnalytics(
    result: FieldAnalyticsResult,
    values: any[],
    field: FormField
  ): void {
    const numericValues = values.map(Number).filter((n) => !isNaN(n));

    if (numericValues.length === 0) return;

    result.average = this.round(
      numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
      2
    );
    result.min = Math.min(...numericValues);
    result.max = Math.max(...numericValues);

    // Median
    const sorted = [...numericValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    result.median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // Trend
    const recentCount = Math.min(5, numericValues.length);
    const recentValues = numericValues.slice(0, recentCount);
    const olderValues = numericValues.slice(recentCount, recentCount * 2);

    if (olderValues.length > 0) {
      result.recentAverage = this.round(
        recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length,
        2
      );
      result.olderAverage = this.round(
        olderValues.reduce((sum, v) => sum + v, 0) / olderValues.length,
        2
      );

      const higherIsBetter = field.analytics.higherIsBetter !== false;
      result.averageTrend = this.determineTrend(
        result.recentAverage,
        result.olderAverage,
        higherIsBetter
      );

      result.improvementRate = this.round(
        ((result.recentAverage - result.olderAverage) / result.olderAverage) * 100,
        1
      );
    }
  }

  /**
   * Sum analytics
   */
  private calculateSumAnalytics(result: FieldAnalyticsResult, values: any[]): void {
    const numericValues = values.map(Number).filter((n) => !isNaN(n));
    result.sum = numericValues.reduce((sum, v) => sum + v, 0);
  }

  /**
   * Distribution analytics (for radio/checkbox fields)
   */
  private calculateDistributionAnalytics(result: FieldAnalyticsResult, values: any[]): void {
    const distribution: { [option: string]: { count: number; percentage: number } } = {};

    // Flatten array values (for checkbox fields)
    const flatValues = values.flatMap((v) => (Array.isArray(v) ? v : [v]));

    // Count occurrences
    flatValues.forEach((value) => {
      const key = String(value);
      if (!distribution[key]) {
        distribution[key] = { count: 0, percentage: 0 };
      }
      distribution[key].count++;
    });

    // Calculate percentages
    const total = flatValues.length;
    Object.keys(distribution).forEach((key) => {
      distribution[key].percentage = Math.round((distribution[key].count / total) * 100);
    });

    result.distribution = distribution;

    // Most common option
    let maxCount = 0;
    let mostCommon = '';
    Object.entries(distribution).forEach(([key, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostCommon = key;
      }
    });

    result.mostCommon = mostCommon;
  }

  /**
   * Consistency analytics
   */
  private calculateConsistencyAnalytics(result: FieldAnalyticsResult, values: any[]): void {
    const numericValues = values.map(Number).filter((n) => !isNaN(n));

    if (numericValues.length < 2) {
      result.consistencyScore = 100;
      return;
    }

    // Calculate standard deviation
    const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
    const squareDiffs = numericValues.map((v) => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / numericValues.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    result.standardDeviation = this.round(stdDev, 2);

    // Consistency score (lower std dev = higher consistency)
    // Normalize to 0-100 scale (assuming max std dev of mean/2 = 0% consistency)
    const maxStdDev = mean / 2;
    result.consistencyScore = Math.round(Math.max(0, (1 - stdDev / maxStdDev) * 100));
  }

  /**
   * Trend analytics
   */
  private calculateTrendAnalytics(
    result: FieldAnalyticsResult,
    values: any[],
    field: FormField
  ): void {
    const numericValues = values.map(Number).filter((n) => !isNaN(n));

    if (numericValues.length < 2) return;

    const recentCount = Math.min(5, numericValues.length);
    const recentAvg =
      numericValues.slice(0, recentCount).reduce((sum, v) => sum + v, 0) / recentCount;
    const olderAvg =
      numericValues.slice(recentCount).reduce((sum, v) => sum + v, 0) /
      (numericValues.length - recentCount);

    const higherIsBetter = field.analytics.higherIsBetter !== false;
    result.percentageTrend = this.determineTrend(recentAvg, olderAvg, higherIsBetter);
    result.average = this.round(recentAvg, 2);
  }

  /**
   * Count analytics
   */
  private calculateCountAnalytics(result: FieldAnalyticsResult, values: any[]): void {
    result.count = values.filter((v) => v !== null && v !== undefined && v !== '').length;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Extracts field values from entries
   */
  private extractFieldValues(
    fieldId: string,
    sectionId: string,
    entries: DynamicChartingEntry[],
    isRepeatable?: boolean
  ): any[] {
    const values: any[] = [];

    entries.forEach((entry) => {
      const sectionData = entry.responses[sectionId];

      if (!sectionData) return;

      if (isRepeatable) {
        const sectionArray = sectionData as any[];
        sectionArray.forEach((instance) => {
          const fieldResponse = instance[fieldId];
          if (fieldResponse !== undefined) {
            const value = typeof fieldResponse === 'object' ? fieldResponse.value : fieldResponse;
            if (value !== null && value !== undefined && value !== '') {
              values.push(value);
            }
          }
        });
      } else {
        const sectionObj = sectionData as any;
        const fieldResponse = sectionObj[fieldId];
        if (fieldResponse !== undefined) {
          const value = typeof fieldResponse === 'object' ? fieldResponse.value : fieldResponse;
          if (value !== null && value !== undefined && value !== '') {
            values.push(value);
          }
        }
      }
    });

    return values;
  }

  /**
   * Finds the first (baseline) or last (latest) numeric value for a field
   * across the given entries, scanning in chronological order and skipping
   * non-numeric responses (e.g. yes/no or text fields have no meaningful
   * baseline/growth value).
   */
  private extractFieldEdgeValue(
    fieldId: string,
    sectionId: string,
    entries: DynamicChartingEntry[],
    isRepeatable: boolean | undefined,
    edge: 'first' | 'last'
  ): { value: number; date: Timestamp } | null {
    const sorted = [...entries].sort((a, b) =>
      compareBySubmittedAt(a, b, edge === 'first' ? 'asc' : 'desc')
    );

    for (const entry of sorted) {
      const values = this.extractFieldValues(fieldId, sectionId, [entry], isRepeatable);
      const numericValue = values.map(Number).find((n) => !isNaN(n));
      if (numericValue !== undefined) {
        return { value: numericValue, date: entry.submittedAt };
      }
    }

    return null;
  }

  /**
   * Calculates session statistics
   */
  private calculateSessionStats(entries: DynamicChartingEntry[]) {
    const totalSessions = entries.length;
    const completedSessions = entries.filter((e) => e.isComplete).length;
    const partialSessions = totalSessions - completedSessions;

    const completionRate =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const avgCompletionPercentage =
      totalSessions > 0
        ? Math.round(
            entries.reduce((sum, e) => sum + e.completionPercentage, 0) / totalSessions
          )
        : 0;

    // Date calculations
    const sortedEntries = [...entries].sort((a, b) => compareBySubmittedAt(a, b, 'desc'));

    const firstSessionDate = sortedEntries[sortedEntries.length - 1]?.submittedAt;
    const lastSessionDate = sortedEntries[0]?.submittedAt;

    // Calculate averages
    let averageSessionsPerWeek = 0;
    let averageSessionsPerMonth = 0;

    const firstMs = millisOf(firstSessionDate);
    const lastMs = millisOf(lastSessionDate);

    if (firstMs !== null && lastMs !== null) {
      const daysDiff = (lastMs - firstMs) / (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        averageSessionsPerWeek = this.round((totalSessions / daysDiff) * 7, 1);
        averageSessionsPerMonth = this.round((totalSessions / daysDiff) * 30, 1);
      }
    }

    return {
      totalSessions,
      completedSessions,
      partialSessions,
      completionRate,
      averageCompletionPercentage: avgCompletionPercentage,
      firstSessionDate,
      lastSessionDate,
      averageSessionsPerWeek,
      averageSessionsPerMonth,
    };
  }

  /**
   * Calculates streak data
   */
  private calculateStreak(entries: DynamicChartingEntry[]) {
    const dates = entries
      .map((e) => {
        const date = toDateSafe(e.submittedAt);
        if (!date) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      })
      .filter((date): date is string => date !== null)
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (currentDate.toISOString() === expectedDate.toISOString()) {
        tempStreak++;
        if (i === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return {
      currentStreak,
      longestStreak,
      lastActiveDate: entries[0]?.submittedAt || Timestamp.now(),
      streakDates: dates,
    };
  }

  /**
   * Determines trend direction
   */
  private determineTrend(
    recentValue: number,
    olderValue: number,
    higherIsBetter: boolean
  ): TrendDirection {
    const threshold = 5; // 5% threshold for "stable"
    const diff = recentValue - olderValue;
    const percentDiff = (Math.abs(diff) / olderValue) * 100;

    if (percentDiff < threshold) {
      return 'stable';
    }

    if (higherIsBetter) {
      return diff > 0 ? 'improving' : 'declining';
    } else {
      return diff < 0 ? 'improving' : 'declining';
    }
  }

  /**
   * Gets majority trend from array of trends
   */
  private getMajorityTrend(trends: TrendDirection[]): TrendDirection {
    if (trends.length === 0) return 'stable';

    const counts = trends.reduce((acc, trend) => {
      acc[trend] = (acc[trend] || 0) + 1;
      return acc;
    }, {} as { [key in TrendDirection]?: number });

    let maxCount = 0;
    let majorityTrend: TrendDirection = 'stable';

    (Object.keys(counts) as TrendDirection[]).forEach((trend) => {
      if (counts[trend]! > maxCount) {
        maxCount = counts[trend]!;
        majorityTrend = trend;
      }
    });

    return majorityTrend;
  }

  /**
   * Converts field analytics to a 0-100 score
   */
  private getFieldScore(fieldAnalytics: FieldAnalyticsResult): number | null {
    if (fieldAnalytics.percentage !== undefined) {
      return fieldAnalytics.percentage;
    }

    if (fieldAnalytics.average !== undefined) {
      // Score against the scale the athlete was rating on, not the spread of
      // their own answers. Measured against the observed range, entries of 4 and
      // 7 always scored exactly 50%, and a run of identical answers always
      // scored 100% — the number tracked the sample, never the performance.
      if (fieldAnalytics.scaleMax === undefined) {
        // An open-ended number has no ceiling, so it has no honest percentage.
        // Leaving it out of the average beats inventing one for it.
        return null;
      }

      // scaleToPercentage is the app-wide rule: 7 out of 10 reads 70%.
      return scaleToPercentage(
        fieldAnalytics.average,
        fieldAnalytics.scaleMax,
        fieldAnalytics.scaleMin
      );
    }

    if (fieldAnalytics.consistencyScore !== undefined) {
      return fieldAnalytics.consistencyScore;
    }

    return null;
  }

  /**
   * Filters entries by date range
   */
  private filterEntriesByDate(
    entries: DynamicChartingEntry[],
    dateFrom?: Date,
    dateTo?: Date
  ): DynamicChartingEntry[] {
    return entries.filter((entry) => {
      const entryDate = toDateSafe(entry.submittedAt);

      // An entry we can't date can't be placed in the window, so it's excluded
      // rather than silently counted as in-range.
      if (!entryDate) {
        return false;
      }

      if (dateFrom && entryDate < dateFrom) {
        return false;
      }

      if (dateTo && entryDate > dateTo) {
        return false;
      }

      return true;
    });
  }

  /**
   * Rounds a number to specified decimal places
   */
  private round(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

// Export singleton instance
export const dynamicAnalyticsService = new DynamicAnalyticsService();
