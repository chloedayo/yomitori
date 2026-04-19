declare module 'restify-cors-middleware' {
  import * as restify from 'restify';

  interface CorsOptions {
    origins?: string[];
    credentials?: boolean;
    maxAge?: number;
  }

  function cors(options?: CorsOptions): {
    preflight: (req: restify.Request, res: restify.Response, next: restify.Next) => void;
    actual: (req: restify.Request, res: restify.Response, next: restify.Next) => void;
  };

  export = cors;
}
