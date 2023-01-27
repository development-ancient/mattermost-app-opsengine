import { AlertCreate, AlertResponderType, AppActingUser, AppCallRequest, AppCallValues, Identifier, IdentifierType, Team } from '../types';
import { OpsGenieClient, OpsGenieOptions } from '../clients/opsgenie';
import { AlertCreateForm, ExceptionType, option_alert_priority_p3 } from '../constant';
import { configureI18n } from '../utils/translations';
import { isUserSystemAdmin, tryPromise } from '../utils/utils';
import { allowMemberAction, getOpsGenieAPIKey, validateUserAccess } from '../utils/user-mapping';
import { Exception } from '../utils/exception';

export async function createAlertCall(call: AppCallRequest): Promise<string> {
    const actingUser: AppActingUser | undefined = call.context.acting_user;
    const isSystemAdmin: boolean = isUserSystemAdmin(actingUser);
    const allowMember: boolean = allowMemberAction(call.context);
    const values: AppCallValues | undefined = call.values;
    const apiKey = getOpsGenieAPIKey(call);
    const i18nObj = configureI18n(call.context);

    const message: string = values?.[AlertCreateForm.ALERT_MESSAGE];
    const priority: string = values?.[AlertCreateForm.ALERT_PRIORITY]?.value || option_alert_priority_p3;
    const teamName: string = values?.[AlertCreateForm.TEAM_NAME];

    const optionsOpsgenie: OpsGenieOptions = {
        api_key: apiKey,
    };
    const opsGenieClient = new OpsGenieClient(optionsOpsgenie);

    const identifier: Identifier = {
        identifier: teamName,
        identifierType: IdentifierType.NAME,
    };

    const team: Team = await tryPromise<Team>(opsGenieClient.getTeam(identifier), ExceptionType.MARKDOWN, i18nObj.__('forms.error'));

    if (!allowMember) {
        throw new Exception(ExceptionType.MARKDOWN, i18nObj.__('general.validation-user.genie-action-invalid'));
    }

    if (!isSystemAdmin) {
        const userEmail: string | undefined = actingUser?.email;
        if (!userEmail) {
            throw new Exception(ExceptionType.TEXT_ERROR, i18nObj.__('general.validation-user.user-not-found'));
        }

        const teamMembers: string[] | undefined = team?.members?.map((member) => member.user.username);
        if (!teamMembers || !teamMembers.includes(userEmail)) {
            throw new Exception(ExceptionType.TEXT_ERROR, i18nObj.__('general.validation-user.genie-team-invalid', { email: actingUser?.email, team: teamName }));
        }
    }

    const alertCreate: AlertCreate = {
        message,
        priority,
        responders: [
            {
                name: teamName,
                type: AlertResponderType.TEAM,
            },
        ],
    };
    await tryPromise(opsGenieClient.createAlert(alertCreate), ExceptionType.MARKDOWN, i18nObj.__('forms.error'));
    return i18nObj.__('forms.create-alert.message', { message });
}
