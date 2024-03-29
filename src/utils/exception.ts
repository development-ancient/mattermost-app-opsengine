import { ExceptionType } from '../constant';

import { Logger } from './logger';

export class Exception extends Error {
    constructor(
        public readonly type: ExceptionType,
        public readonly message: string,
        public readonly mattermostUrl: string | undefined,
        public readonly requestPath: string | undefined
    ) {
        super(message);
        Logger.error({ message, mattermostUrl, requestPath });
    }
}
