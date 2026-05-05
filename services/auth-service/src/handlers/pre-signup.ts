import type { PreSignUpTriggerHandler } from 'aws-lambda';
import { config } from '../lib/config';

export const handler: PreSignUpTriggerHandler = async (event) => {
  // Auto-confirm user and email in dev — skips the verification email flow
  if (config.appEnv === 'dev') {
    event.response.autoConfirmUser  = true;
    event.response.autoVerifyEmail  = true;
  }

  console.log(JSON.stringify({
    level:   'info',
    message: 'pre-signup trigger fired',
    email:   event.request.userAttributes.email,
    appEnv:  config.appEnv,
  }));

  return event;
};
