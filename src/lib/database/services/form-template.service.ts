import { BaseDatabaseService } from '../base.service';
import {
  FormTemplate,
  FormField,
  FormTemplateQueryOptions,
  TemplateValidationResult,
  FieldType,
  AnalyticsType,
  ApiResponse,
  PillarSlug,
} from '@/types';
import {
  Timestamp,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  collection,
  doc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { logger } from '../../utils/logger';
import { db } from '../../firebase/config';

/**
 * Service for managing dynamic form templates in the charting system.
 *
 * This service provides functionality for:
 * - Creating and managing form templates
 * - Template validation
 * - Versioning and activation
 * - Template cloning and archiving
 *
 * @example
 * ```typescript
 * // Create a new template
 * const template = await formTemplateService.createTemplate({
 *   name: 'Hockey Goalie Performance',
 *   sport: 'Hockey',
 *   sections: [...]
 * });
 *
 * // Activate a template
 * await formTemplateService.activateTemplate(templateId);
 * ```
 */
/**
 * Renders a validation path such as `sections[0].fields[2].label` in the wording
 * the builder screen uses, so an error can be read against the thing on screen
 * rather than against an internal path.
 */
export function describeValidationPath(path: string): string {
  const section = /sections\[(\d+)\]/.exec(path);
  const field = /fields\[(\d+)\]/.exec(path);
  if (section && field) return `Section ${Number(section[1]) + 1}, field ${Number(field[1]) + 1}`;
  if (section) return `Section ${Number(section[1]) + 1}`;
  return '';
}

/**
 * The message a save failure reports.
 *
 * This used to be the fixed string "Template validation failed", which named
 * neither the reason nor the field, leaving no way to correct the template. The
 * reason was already known here — it was just being discarded.
 */
export function describeValidationFailure(errors: { path: string; message: string }[]): string {
  if (errors.length === 0) return 'Template validation failed';
  const [first] = errors;
  const where = describeValidationPath(first.path);
  const headline = where ? `${where} — ${first.message}` : first.message;
  return errors.length === 1 ? headline : `${headline} (and ${errors.length - 1} more)`;
}

export class FormTemplateService extends BaseDatabaseService {
  private readonly TEMPLATES_COLLECTION = 'form_templates';

  // ==================== TEMPLATE CRUD OPERATIONS ====================

  /**
   * Creates a new form template
   */
  async createTemplate(
    templateData: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.TEMPLATES_COLLECTION, undefined, {
      name: templateData.name,
      sport: templateData.sport,
    });

    // Validate template structure
    const validation = this.validateTemplate(templateData as FormTemplate);
    if (!validation.isValid) {
      return {
        success: false,
        message: describeValidationFailure(validation.errors),
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.map((e) => e.message).join(', '),
          details: validation.errors,
        },
        timestamp: new Date(),
      };
    }

    // If this template should be active, deactivate others in the same (sport, pillar) scope
    if (templateData.isActive && templateData.sport) {
      await this.deactivateTemplatesInScope(templateData.sport, templateData.pillar);
    }

    const cleanedData = {
      ...templateData,
      version: 1,
      isArchived: false,
      usageCount: 0,
    };

    const result = await this.create<FormTemplate>(this.TEMPLATES_COLLECTION, cleanedData);

    if (result.success) {
      logger.info('Form template created successfully', 'FormTemplateService', {
        templateId: result.data!.id,
        name: templateData.name,
      });
    }

    return result;
  }

  /**
   * Gets a form template by ID
   */
  async getTemplate(templateId: string): Promise<ApiResponse<FormTemplate | null>> {
    logger.database('read', this.TEMPLATES_COLLECTION, templateId);

    return await this.getById<FormTemplate>(this.TEMPLATES_COLLECTION, templateId);
  }

  /**
   * Updates a form template.
   *
   * A template that has already been filled in is never edited in place. Every
   * stored entry keys its answers by field ID, so rewording or removing a field
   * would retroactively change what past answers claim to say. The edit is
   * written as a new version instead and the current one archived, leaving
   * recorded entries pointing at the wording they were actually answered under.
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<FormTemplate>,
    createNewVersion: boolean = false
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('update', this.TEMPLATES_COLLECTION, templateId, { createNewVersion });

    // Get current template
    const currentResult = await this.getTemplate(templateId);
    if (!currentResult.success || !currentResult.data) {
      return {
        success: false,
        message: 'Template not found',
        error: {
          code: 'NOT_FOUND',
          message: 'Template does not exist',
        },
        timestamp: new Date(),
      };
    }

    const currentTemplate = currentResult.data;

    // Check if we should create a new version
    if (createNewVersion || (currentTemplate.usageCount && currentTemplate.usageCount > 0)) {
      return await this.createNextVersion(currentTemplate, updates);
    }

    // Validate updated template
    const updatedTemplate = { ...currentTemplate, ...updates };
    const validation = this.validateTemplate(updatedTemplate);
    if (!validation.isValid) {
      return {
        success: false,
        message: describeValidationFailure(validation.errors),
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.map((e) => e.message).join(', '),
          details: validation.errors,
        },
        timestamp: new Date(),
      };
    }

    // If activating this template, deactivate others in the same (sport, pillar) scope
    if (updates.isActive && currentTemplate.sport) {
      const pillar = updates.pillar ?? currentTemplate.pillar ?? 'combined';
      await this.deactivateTemplatesInScope(currentTemplate.sport, pillar, templateId);
    }

    const result = await this.update<FormTemplate>(this.TEMPLATES_COLLECTION, templateId, updates);

    if (result.success) {
      logger.info('Form template updated successfully', 'FormTemplateService', {
        templateId,
      });
      return {
        success: true,
        data: { id: templateId },
        timestamp: new Date(),
      };
    }

    return {
      success: false,
      error: result.error,
      timestamp: new Date(),
    };
  }

  /**
   * Writes an edit as version n+1 and retires version n.
   *
   * Two things here were previously wrong in ways that only surface once a
   * template is actually edited:
   *
   * 1. The version number was computed and then thrown away. This routed through
   *    `createTemplate`, which hardcodes `version: 1` on everything it writes, so
   *    every "new version" of a template came out as v1 again — leaving no way to
   *    tell which of two archived templates came first.
   * 2. The old version was archived *before* the replacement was written. If the
   *    new version then failed to validate or the write failed, the admin was
   *    left with the edit discarded and the only working template archived. The
   *    replacement is created first now, and the old one retired only once its
   *    successor exists.
   */
  private async createNextVersion(
    current: FormTemplate,
    updates: Partial<FormTemplate>
  ): Promise<ApiResponse<{ id: string }>> {
    // `id` and the timestamps describe the document being replaced. Carried over,
    // they write a stale `id` field inside the new document and backdate it to
    // the moment the original was created.
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...carried } = current;

    const nextVersion = {
      ...carried,
      ...updates,
      version: current.version + 1,
      usageCount: 0,
      isArchived: false,
    } as Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>;

    // Validate before anything is written, so a rejected edit leaves the current
    // version exactly as it was.
    const validation = this.validateTemplate(nextVersion as FormTemplate);
    if (!validation.isValid) {
      return {
        success: false,
        message: describeValidationFailure(validation.errors),
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.map((e) => e.message).join(', '),
          details: validation.errors,
        },
        timestamp: new Date(),
      };
    }

    // Stand down any other active template in this scope — but not the one being
    // replaced, which stays live until its successor is safely written.
    if (nextVersion.isActive && nextVersion.sport) {
      await this.deactivateTemplatesInScope(
        nextVersion.sport,
        nextVersion.pillar ?? 'combined',
        current.id
      );
    }

    const created = await this.create<FormTemplate>(this.TEMPLATES_COLLECTION, nextVersion);
    if (!created.success || !created.data) {
      return {
        success: false,
        message: created.message || 'Could not save the new version. The current version is unchanged.',
        error: created.error,
        timestamp: new Date(),
      };
    }

    const archived = await this.archiveTemplate(current.id);
    if (!archived.success) {
      // The new version is live; the old one simply did not get retired, which
      // leaves two active templates in one scope. Reported rather than swallowed,
      // because the admin has to resolve it by hand.
      logger.error(
        'New template version saved, but the previous version could not be archived',
        'FormTemplateService',
        { previousTemplateId: current.id, newTemplateId: created.data.id }
      );
      return {
        success: true,
        data: { id: created.data.id },
        message: `Saved as version ${nextVersion.version}, but version ${current.version} could not be archived — archive it manually.`,
        timestamp: new Date(),
      };
    }

    logger.info('Form template saved as a new version', 'FormTemplateService', {
      previousTemplateId: current.id,
      newTemplateId: created.data.id,
      version: nextVersion.version,
    });

    return {
      success: true,
      data: { id: created.data.id },
      message: `Saved as version ${nextVersion.version}. Version ${current.version} has been archived.`,
      timestamp: new Date(),
    };
  }

  /**
   * Deletes a form template
   * Only allowed if template has no usage
   */
  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    logger.database('delete', this.TEMPLATES_COLLECTION, templateId);

    // Check if template is in use
    const templateResult = await this.getTemplate(templateId);
    if (!templateResult.success || !templateResult.data) {
      return {
        success: false,
        message: 'Template not found',
        timestamp: new Date(),
      };
    }

    if (templateResult.data.usageCount && templateResult.data.usageCount > 0) {
      return {
        success: false,
        message: 'Cannot delete template that is in use. Archive it instead.',
        error: {
          code: 'TEMPLATE_IN_USE',
          message: 'Cannot delete template that is in use. Archive it instead.',
        },
        timestamp: new Date(),
      };
    }

    return await this.delete(this.TEMPLATES_COLLECTION, templateId);
  }

  /**
   * Archives a template (soft delete)
   */
  async archiveTemplate(templateId: string): Promise<ApiResponse<void>> {
    logger.database('update', this.TEMPLATES_COLLECTION, templateId, { archive: true });

    return await this.update<FormTemplate>(this.TEMPLATES_COLLECTION, templateId, {
      isArchived: true,
      isActive: false,
    });
  }

  /**
   * Restores an archived template
   */
  async restoreTemplate(templateId: string): Promise<ApiResponse<void>> {
    logger.database('update', this.TEMPLATES_COLLECTION, templateId, { restore: true });

    return await this.update<FormTemplate>(this.TEMPLATES_COLLECTION, templateId, {
      isArchived: false,
    });
  }

  /**
   * Clones a template with a new name
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('read', this.TEMPLATES_COLLECTION, templateId, { action: 'clone' });

    // Get original template
    const originalResult = await this.getTemplate(templateId);
    if (!originalResult.success || !originalResult.data) {
      return {
        success: false,
        message: 'Template not found',
        timestamp: new Date(),
      };
    }

    const original = originalResult.data;

    // Create clone with new name
    const cloneData = {
      ...original,
      name: newName,
      isActive: false, // Clones are not active by default
      isArchived: false,
      createdBy,
      // Remove ID and timestamps - will be generated by create
    } as Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount'>;

    return await this.createTemplate(cloneData);
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Gets all templates based on query options
   */
  async getTemplates(
    options: FormTemplateQueryOptions = {}
  ): Promise<ApiResponse<FormTemplate[]>> {
    logger.database('query', this.TEMPLATES_COLLECTION, undefined, options);

    try {
      const templatesRef = collection(db, this.TEMPLATES_COLLECTION);
      let q = query(templatesRef);

      // Apply filters
      if (options.sport !== undefined) {
        q = query(q, where('sport', '==', options.sport));
      }
      if (options.pillar !== undefined) {
        q = query(q, where('pillar', '==', options.pillar));
      }
      if (options.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive));
      }
      if (options.isArchived !== undefined) {
        q = query(q, where('isArchived', '==', options.isArchived));
      }
      if (options.createdBy) {
        q = query(q, where('createdBy', '==', options.createdBy));
      }

      // Apply ordering
      const orderField = options.orderBy || 'createdAt';
      const orderDir = options.orderDirection || 'desc';
      q = query(q, orderBy(orderField, orderDir));

      // Apply limit
      if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FormTemplate[];

      return {
        success: true,
        data: templates,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error querying templates', 'FormTemplateService', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        message: 'Failed to query templates',
        error: {
          code: 'QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets the active template for a specific (sport, pillar) scope.
   * Multiple pillar templates can be active at once for the same sport
   * (e.g. "combined", "mindset", "skating" can all be active simultaneously) —
   * this returns only the one matching the given scope.
   */
  async getActiveTemplate(scope: {
    sport: string;
    pillar: PillarSlug | 'combined';
  }): Promise<ApiResponse<FormTemplate | null>> {
    logger.database('query', this.TEMPLATES_COLLECTION, undefined, {
      isActive: true,
      ...scope,
    });

    const result = await this.getTemplates({
      sport: scope.sport,
      pillar: scope.pillar,
      isActive: true,
      isArchived: false,
      limit: 1,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to get templates',
        error: result.error,
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      timestamp: new Date(),
    };
  }

  /**
   * Gets every simultaneously-active template for a sport, across all pillars.
   * Used by the student dashboard to render all active pillar charts at once
   * instead of issuing one getActiveTemplate() call per pillar.
   */
  async getActiveTemplatesForSport(sport: string): Promise<ApiResponse<FormTemplate[]>> {
    logger.database('query', this.TEMPLATES_COLLECTION, undefined, {
      sport,
      isActive: true,
    });

    return await this.getTemplates({
      sport,
      isActive: true,
      isArchived: false,
    });
  }

  /**
   * Gets templates by creator
   */
  async getTemplatesByCreator(
    userId: string,
    includeArchived: boolean = false
  ): Promise<ApiResponse<FormTemplate[]>> {
    return await this.getTemplates({
      createdBy: userId,
      isArchived: includeArchived ? undefined : false,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });
  }

  // ==================== TEMPLATE ACTIVATION ====================

  /**
   * Activates a template. Deactivates all other templates in the same
   * (sport, pillar) scope, so templates for a different pillar (or a
   * different sport) are left untouched — multiple pillars can be
   * concurrently active.
   */
  async activateTemplate(templateId: string): Promise<ApiResponse<void>> {
    logger.database('update', this.TEMPLATES_COLLECTION, templateId, {
      action: 'activate',
    });

    try {
      const templateResult = await this.getTemplate(templateId);
      if (!templateResult.success || !templateResult.data) {
        return {
          success: false,
          message: 'Template not found',
          timestamp: new Date(),
        };
      }

      const template = templateResult.data;
      const sport = template.sport || 'Hockey';
      const pillar = template.pillar || 'combined';

      await this.deactivateTemplatesInScope(sport, pillar, templateId);

      const result = await this.update<FormTemplate>(this.TEMPLATES_COLLECTION, templateId, {
        isActive: true,
      });

      if (result.success) {
        logger.info('Form template activated successfully', 'FormTemplateService', {
          templateId,
          sport,
          pillar,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error activating template', 'FormTemplateService', {
        error: error instanceof Error ? error.message : String(error),
        templateId,
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during activation',
        error: {
          code: 'ACTIVATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Deactivates all active templates within a (sport, pillar) scope, optionally
   * excluding one template ID. Applied atomically via writeBatch so a failure
   * partway through can't leave two templates simultaneously active in the
   * same scope.
   */
  private async deactivateTemplatesInScope(
    sport: string,
    pillar: PillarSlug | 'combined',
    exceptTemplateId?: string
  ): Promise<void> {
    const templatesRef = collection(db, this.TEMPLATES_COLLECTION);
    const q = query(
      templatesRef,
      where('sport', '==', sport),
      where('pillar', '==', pillar),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const toDeactivate = snapshot.docs.filter((docSnap) => docSnap.id !== exceptTemplateId);

    if (toDeactivate.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    toDeactivate.forEach((docSnap) => {
      batch.update(docSnap.ref, { isActive: false, updatedAt: serverTimestamp() });
    });

    await batch.commit();

    logger.info('Deactivated templates in scope', 'FormTemplateService', {
      sport,
      pillar,
      count: toDeactivate.length,
      exceptTemplateId,
    });
  }

  // ==================== TEMPLATE VALIDATION ====================

  /**
   * Validates a form template structure
   */
  validateTemplate(template: Partial<FormTemplate>): TemplateValidationResult {
    const errors: { path: string; message: string }[] = [];
    const warnings: { path: string; message: string }[] = [];

    // Basic validation
    if (!template.name || template.name.trim().length === 0) {
      errors.push({ path: 'name', message: 'Template name is required' });
    }

    if (!template.sections || template.sections.length === 0) {
      errors.push({ path: 'sections', message: 'Template must have at least one section' });
    }

    // Validate sections
    if (template.sections) {
      const sectionIds = new Set<string>();

      template.sections.forEach((section, sIdx) => {
        const sectionPath = `sections[${sIdx}]`;

        // Check for duplicate section IDs
        if (sectionIds.has(section.id)) {
          errors.push({
            path: `${sectionPath}.id`,
            message: `This section shares an internal ID (${section.id}) with an earlier section. Delete it and add it again.`,
          });
        }
        sectionIds.add(section.id);

        // Validate section
        if (!section.title || section.title.trim().length === 0) {
          errors.push({
            path: `${sectionPath}.title`,
            message: 'Section title is required',
          });
        }

        if (!section.fields || section.fields.length === 0) {
          warnings.push({
            path: `${sectionPath}.fields`,
            message: 'Section has no fields',
          });
        }

        // Validate fields
        if (section.fields) {
          const fieldIds = new Set<string>();

          section.fields.forEach((field, fIdx) => {
            const fieldPath = `${sectionPath}.fields[${fIdx}]`;

            // Check for duplicate field IDs
            if (fieldIds.has(field.id)) {
              errors.push({
                path: `${fieldPath}.id`,
                message: `This field shares an internal ID (${field.id}) with an earlier field in the same section. Delete it and add it again.`,
              });
            }
            fieldIds.add(field.id);

            // Validate field
            const fieldErrors = this.validateField(field, fieldPath);
            errors.push(...fieldErrors);
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a single field
   */
  private validateField(field: FormField, path: string): { path: string; message: string }[] {
    const errors: { path: string; message: string }[] = [];

    // Basic validation
    if (!field.label || field.label.trim().length === 0) {
      errors.push({ path: `${path}.label`, message: 'Field label is required' });
    }

    if (!field.type) {
      errors.push({ path: `${path}.type`, message: 'Field type is required' });
    }

    // Validate field type specific requirements
    if (field.type === 'radio' || field.type === 'checkbox') {
      if (!field.options || field.options.length === 0) {
        errors.push({
          path: `${path}.options`,
          message: 'Radio and checkbox fields require options',
        });
      }
    }

    if (field.type === 'scale' || field.type === 'numeric') {
      if (
        field.validation?.min !== undefined &&
        field.validation?.max !== undefined &&
        field.validation.min >= field.validation.max
      ) {
        errors.push({
          path: `${path}.validation`,
          message: 'Min value must be less than max value',
        });
      }
    }

    // Validate analytics configuration
    if (field.analytics?.enabled) {
      if (!field.analytics.type || field.analytics.type === 'none') {
        errors.push({
          path: `${path}.analytics.type`,
          message: 'Analytics type required when analytics is enabled',
        });
      }

      // Check analytics type compatibility with field type
      const incompatibleCombos: { [key in FieldType]?: AnalyticsType[] } = {
        yesno: ['sum', 'distribution'],
        text: ['average', 'sum', 'percentage'],
        textarea: ['average', 'sum', 'percentage'],
        radio: ['average', 'sum'],
        checkbox: ['average', 'sum'],
      };

      const incompatible = incompatibleCombos[field.type];
      if (incompatible && incompatible.includes(field.analytics.type)) {
        errors.push({
          path: `${path}.analytics.type`,
          message: `Analytics type '${field.analytics.type}' is not compatible with field type '${field.type}'`,
        });
      }
    }

    return errors;
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Increments the usage count for a template
   * Called when a new entry is created using this template
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, this.TEMPLATES_COLLECTION, templateId);
      await updateDoc(templateRef, {
        usageCount: increment(1),
      });
    } catch (error) {
      logger.error('Error incrementing template usage count', 'FormTemplateService', { error: error instanceof Error ? error.message : String(error),
        templateId,
      });
    }
  }

  /**
   * Gets template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<
    ApiResponse<{
      usageCount: number;
      activeUsers: number;
      lastUsed?: Timestamp;
    }>
  > {
    const templateResult = await this.getTemplate(templateId);
    if (!templateResult.success || !templateResult.data) {
      return {
        success: false,
        message: 'Template not found',
        timestamp: new Date(),
      };
    }

    // For now, return basic stats from template
    // Can be enhanced to query actual entry data
    return {
      success: true,
      data: {
        usageCount: templateResult.data.usageCount || 0,
        activeUsers: 0, // Would need to query entries
        lastUsed: undefined, // Would need to query entries
      },
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const formTemplateService = new FormTemplateService();
