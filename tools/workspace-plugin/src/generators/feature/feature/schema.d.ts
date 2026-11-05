export interface FeatureGeneratorSchema {
  name: string;
  scope: string;
  spec: string;
  route?: string;
  renderMode?: 'server' | 'prerender' | 'client';
}
