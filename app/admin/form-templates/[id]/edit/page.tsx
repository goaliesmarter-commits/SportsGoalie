'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formTemplateService } from '@/lib/database/services/form-template.service';
import { FormTemplate } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TemplateBuilder from '../../TemplateBuilder';

const BLUE = '#37b5ff';

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const result = await formTemplateService.getTemplate(templateId);
        if (cancelled) return;

        if (result.success && result.data) {
          setTemplate(result.data);
        } else {
          toast.error('Failed to load template');
          router.push('/admin/form-templates');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading template:', error);
        toast.error('Error loading template');
        router.push('/admin/form-templates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTemplate();
    return () => { cancelled = true; };
  }, [templateId, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 size={32} color={BLUE} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!template) return null;

  // Keyed on the template ID so the builder's state is seeded from this
  // template — remounting rather than holding a previous template's fields if
  // the route changes underneath it.
  return <TemplateBuilder key={template.id} mode="edit" template={template} />;
}
