declare module '*.ink?compiled' {
  const story: {
    readonly json: string;
    readonly declaredExternals: readonly string[];
  };
  export default story;
}
