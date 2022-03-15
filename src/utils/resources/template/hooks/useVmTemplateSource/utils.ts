import { PersistentVolumeClaimModel, V1Template } from '@kubevirt-ui/kubevirt-api/console';
import DataSourceModel from '@kubevirt-ui/kubevirt-api/console/models/DataSourceModel';
import { V1beta1DataSource } from '@kubevirt-ui/kubevirt-api/containerized-data-importer/models';
import {
  V1alpha1PersistentVolumeClaim,
  V1beta1DataVolumeSourceHTTP,
  V1beta1DataVolumeSourcePVC,
  V1beta1DataVolumeSourceRef,
  V1beta1DataVolumeSourceRegistry,
  V1VirtualMachine,
} from '@kubevirt-ui/kubevirt-api/kubevirt';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';

import { BOOT_SOURCE } from '../../utils/constants';
import { getTemplateVirtualMachineObject } from '../../utils/selectors';

export type TemplateBootSource = {
  type: BOOT_SOURCE;
  source: {
    sourceRef?: V1beta1DataVolumeSourceRef;
    pvc?: V1beta1DataVolumeSourcePVC;
    http?: V1beta1DataVolumeSourceHTTP;
    registry?: V1beta1DataVolumeSourceRegistry;
  };
  sourceValue?: {
    sourceRef?: V1alpha1PersistentVolumeClaim;
    pvc?: V1alpha1PersistentVolumeClaim;
    http?: V1beta1DataVolumeSourceHTTP;
    registry?: V1beta1DataVolumeSourceRegistry;
  };
};

export const TEMPLATE_ROOTDISK_VOLUME_NAME = '${NAME}';

// Only used for replacing parameters in the template, do not use for anything else
// eslint-disable-next-line require-jsdoc
const poorManProcess = (template: V1Template): V1Template => {
  if (!template) return null;

  let templateString = JSON.stringify(template);

  template.parameters
    .filter((p) => p.value)
    .forEach((p) => {
      templateString = templateString.replaceAll(`\${${p.name}}`, p.value);
    });

  return JSON.parse(templateString);
};

/**
 * a function to get the boot source from a vm and its status
 * @param {V1VirtualMachine} vm - the template to get the boot source from
 * @returns the vm's boot source and its status
 */
export const getVMBootSourceType = (vm: V1VirtualMachine): TemplateBootSource => {
  const rootVolume = vm?.spec?.template?.spec?.volumes?.find(
    (v) => v.name === TEMPLATE_ROOTDISK_VOLUME_NAME,
  );
  const rootDataVolumeTemplate = vm?.spec?.dataVolumeTemplates?.find(
    (dv) => dv.metadata?.name === rootVolume?.name,
  );

  if (rootDataVolumeTemplate?.spec?.sourceRef) {
    const sourceRef = rootDataVolumeTemplate?.spec?.sourceRef;

    if (sourceRef?.kind === DataSourceModel.kind) {
      return {
        type: BOOT_SOURCE.PVC_AUTO_UPLOAD,
        source: { sourceRef },
      };
    }
  }

  if (rootDataVolumeTemplate?.spec?.source) {
    const source = rootDataVolumeTemplate?.spec?.source;

    if (source?.http) {
      return {
        type: BOOT_SOURCE.URL,
        source: { http: source?.http },
      };
    }
    if (source?.registry) {
      return {
        type: BOOT_SOURCE.REGISTRY,
        source: { registry: source?.registry },
      };
    }
    if (source?.pvc) {
      return {
        type: BOOT_SOURCE.PVC,
        source: { pvc: source?.pvc },
      };
    }
  }

  return null;
};

/**
 * a function to get the boot source from a vm and its status
 * @param {V1Template} template - the template to get the boot source from
 * @returns the template's boot source and its status
 */
export const getTemplateBootSourceType = (template: V1Template): TemplateBootSource => {
  const vmObject = getTemplateVirtualMachineObject(poorManProcess(template));
  return getVMBootSourceType(vmObject);
};

/**
 * a function to k8sGet a PVC
 * @param name the name of the PVC
 * @param ns  the namespace of the PVC
 * @returns a promise that resolves into the PVC
 */
export const getPVC = (name: string, ns: string) =>
  k8sGet<V1alpha1PersistentVolumeClaim>({
    model: PersistentVolumeClaimModel,
    name,
    ns,
  });

/**
 * a function to k8sGet a DataSource
 * @param name the name of the DataSource
 * @param ns  the namespace of the DataSource
 * @returns a promise that resolves into the DataSource
 */
export const getDataSource = (name: string, ns: string) =>
  k8sGet<V1beta1DataSource>({
    model: DataSourceModel,
    name,
    ns,
  });

/**
 * a function to k8sGet a DataSource
 * @param name the name of the DataSource
 * @param ns  the namespace of the DataSource
 * @returns a promise that resolves into the DataSource
 */
export const getDataSourcePVC = (name: string, ns: string) =>
  getDataSource(name, ns)
    .then((data) => data?.spec?.source?.pvc)
    .then((pvc) => getPVC(pvc.name, pvc.namespace));
