import { V1Template } from '@kubevirt-ui/kubevirt-api/console';
import { getLabel } from '@kubevirt-utils/resources/shared';

import { TEMPLATE_DEPRECATED_ANNOTATION } from './constants';

// Only used for replacing parameters in the template, do not use for anything else
// eslint-disable-next-line require-jsdoc
export const poorManProcess = (template: V1Template): V1Template => {
  if (!template) return null;

  let templateString = JSON.stringify(template);

  template.parameters
    .filter((p) => p.value)
    .forEach((p) => {
      templateString = templateString.replaceAll(`\${${p.name}}`, p.value);
    });

  return JSON.parse(templateString);
};

export const isDeprecatedTemplate = (template: V1Template): boolean =>
  getLabel(template, TEMPLATE_DEPRECATED_ANNOTATION) === 'true';
