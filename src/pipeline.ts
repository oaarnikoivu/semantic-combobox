import {
  FeatureExtractionPipeline,
  pipeline,
  PipelineType,
} from "@huggingface/transformers";
import { DeviceType } from "node_modules/@huggingface/transformers/types/utils/devices";
import { DataType } from "node_modules/@huggingface/transformers/types/utils/dtypes";

export class Pipeline {
  private static task: PipelineType = "feature-extraction";
  static model = "Xenova/bert-base-uncased";
  static device: DeviceType = "wasm";
  static dtype: DataType = "q8";
  static revision = "default";
  static instance: FeatureExtractionPipeline | null = null;

  static async getInstance() {
    if (!this.instance) {
      this.instance = (await pipeline(this.task, this.model, {
        device: this.device,
        dtype: this.dtype,
        revision: this.revision,
      })) as FeatureExtractionPipeline;
    }
    return this.instance;
  }
}
