'use client';

import React from 'react';
import { FormField, FieldResponse } from '@/types';
import { DynamicYesNoField } from './DynamicYesNoField';
import { DynamicRadioField } from './DynamicRadioField';
import { DynamicCheckboxField } from './DynamicCheckboxField';
import { DynamicNumericField } from './DynamicNumericField';
import { DynamicScaleField } from './DynamicScaleField';
import { DynamicTextField } from './DynamicTextField';
import { DynamicTextareaField } from './DynamicTextareaField';

export interface DynamicFieldProps {
  field: FormField;
  value?: FieldResponse;
  onChange: (value: FieldResponse) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Word labels for the low and high ends of a `scale` field. Templates don't
   * carry these, and they aren't universal — the Hockey tracker's scales mean
   * "Easy to Very Difficult", the pillar check-ins mean "Weak to Strong" — so
   * the consumer supplies them. Omitted means numbers only.
   */
  scaleAnchors?: { low: string; high: string };
  /**
   * How a `scale` field is rated. `stars` puts it on the 5-Star development
   * scale; `numeric` keeps the 1-N control. Opt-in rather than automatic,
   * because not every scale is a development rating — a "Degree of Challenge"
   * measures the period, not the goalie. Either way the value stored is the
   * same number, so analytics and charts don't move.
   */
  scaleDisplay?: 'stars' | 'numeric';
}

/**
 * Main dynamic field component that renders the appropriate field type
 * based on the field configuration
 */
export const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  className,
  scaleAnchors,
  scaleDisplay,
}) => {
  // Render the appropriate field component based on type
  switch (field.type) {
    case 'yesno':
      return (
        <DynamicYesNoField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    case 'radio':
      return (
        <DynamicRadioField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    case 'checkbox':
      return (
        <DynamicCheckboxField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    case 'numeric':
      return (
        <DynamicNumericField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    case 'scale':
      return (
        <DynamicScaleField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
          scaleAnchors={scaleAnchors}
          scaleDisplay={scaleDisplay}
        />
      );

    case 'text':
      return (
        <DynamicTextField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    case 'textarea':
      return (
        <DynamicTextareaField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          className={className}
        />
      );

    default:
      return (
        <div className="text-red-500">
          Unsupported field type: {field.type}
        </div>
      );
  }
};
