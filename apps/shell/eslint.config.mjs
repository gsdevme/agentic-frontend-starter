import baseConfig from '../../eslint.config.mjs';
import { angularConfig } from '../../eslint.angular.mjs';

export default [...angularConfig('app'), ...baseConfig];
