declare module 'bcryptjs' {
  function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export { hash };
  const _default: {
    hash: typeof hash;
  };
  export default _default;
}
