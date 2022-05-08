import { modelToGroupVersionKind, TemplateModel } from '@kubevirt-ui/kubevirt-api/console';
import { V1VirtualMachine } from '@kubevirt-ui/kubevirt-api/kubevirt';
import { TEMPLATE_TYPE_BASE, TEMPLATE_TYPE_LABEL } from '@kubevirt-utils/resources/template';
import { isEmpty } from '@kubevirt-utils/utils/utils';
import {
  K8sModel,
  K8sResourceCommon,
  Operator,
  WatchK8sResults,
} from '@openshift-console/dynamic-plugin-sdk';

export const getVMStatus = (vm: V1VirtualMachine) => vm?.status?.printableStatus;

export const getAllowedResources = (projectNames: string[], model: K8sModel) => {
  return Object.fromEntries(
    (projectNames || []).map((projName) => [
      `${projName}/${model.plural}`,
      {
        groupVersionKind: modelToGroupVersionKind(model),
        namespaced: true,
        namespace: projName,
        isList: true,
      },
    ]),
  );
};

export const getAllowedResourceData = (
  resources: WatchK8sResults<{
    [key: string]: K8sResourceCommon[];
  }>,
  model: K8sModel,
) => {
  const bla = Object.entries(resources)
    .map(([key, { data, loaded, loadError }]) => {
      if (
        loaded &&
        (key?.includes(model.plural) || (model === TemplateModel && key === 'vmCommonTemplates')) &&
        !isEmpty(data)
      ) {
        return { data, loaded, loadError };
      }
    })
    .filter(Boolean);

  const resourceData = (bla || []).map(({ data }) => data).flat();
  const resourceLoaded = (bla || []).map(({ loaded }) => loaded)?.every((vmLoaded) => vmLoaded);
  const resourceLoadError = (bla || [])
    .map(({ loadError }) => loadError)
    ?.filter(Boolean)
    ?.join('');
  return { data: resourceData, loaded: resourceLoaded, loadError: resourceLoadError };
};

export const getAllowedTemplateResources = (projectNames: string[]) => {
  const TemplateModelGroupVersionKind = modelToGroupVersionKind(TemplateModel);
  const allowedTemplateResources = Object.fromEntries(
    (projectNames || []).map((projName) => [
      `${projName}/${TemplateModel.plural}`,
      {
        groupVersionKind: TemplateModelGroupVersionKind,
        namespace: projName,
        selector: {
          matchExpressions: [
            {
              operator: Operator.Exists,
              key: TEMPLATE_TYPE_LABEL,
            },
          ],
        },
        isList: true,
      },
    ]),
  );
  return {
    ...allowedTemplateResources,
    vmCommonTemplates: {
      groupVersionKind: TemplateModelGroupVersionKind,
      isList: true,
      namespace: 'openshift',
      selector: {
        matchLabels: { [TEMPLATE_TYPE_LABEL]: TEMPLATE_TYPE_BASE },
      },
    },
  };
};