import { AppActingUser, AppCallRequest, AppCallValues, AppForm, AppSelectOption, Integration, Subscription, Teams } from '../types';
import { AppExpandLevels, AppFieldTypes, ExceptionType, OpsGenieIcon, Routes, SubscriptionDeleteForm } from '../constant';
import { OpsGenieClient, OpsGenieOptions } from '../clients/opsgenie';
import { configureI18n } from '../utils/translations';
import { getIntegrationsList, isUserSystemAdmin, tryPromise } from '../utils/utils';
import { Exception } from '../utils/exception';
import { allowMemberAction, ExtendRequired, getOpsGenieAPIKey } from '../utils/user-mapping';
import { getAllTeamsCall } from './list-team';

export async function subscriptionDeleteCall(call: AppCallRequest): Promise<string> {
    const actingUser: AppActingUser | undefined = call.context.acting_user;
    const isSystemAdmin: boolean = isUserSystemAdmin(actingUser);
    const allowMember: boolean = allowMemberAction(call.context);
    const values: AppCallValues | undefined = call.values;
    const i18nObj = configureI18n(call.context);
    const apiKey = getOpsGenieAPIKey(call);

    const optionsOps: OpsGenieOptions = {
        api_key: apiKey,
    };
    const opsGenieClient: OpsGenieClient = new OpsGenieClient(optionsOps);
    const subscription: AppSelectOption = values?.[SubscriptionDeleteForm.SUBSCRIPTION_ID];

    if (allowMember) {
        if (!isSystemAdmin) {
            const opsSubscription: Integration = await tryPromise<Integration>(opsGenieClient.getIntegration(subscription.value), ExceptionType.MARKDOWN, i18nObj.__('forms.error'));

            const teams: Teams[] = await getAllTeamsCall(call);
            const teamsIds: string[] = teams.map(team => team.id);

            if (!teamsIds.includes(opsSubscription.ownerTeam.id)) {
                throw new Exception(ExceptionType.MARKDOWN, i18nObj.__('binding.binding.command-delete-no-found'));
            }
        }
    } else {
        throw new Exception(ExceptionType.MARKDOWN, i18nObj.__('forms.configure-admin.genie-action-invalid'));
    }

    await tryPromise(opsGenieClient.deleteIntegration(subscription.value), ExceptionType.MARKDOWN, i18nObj.__('forms.error'));
    return i18nObj.__('api.subcription.message-delete');
}

export async function subscriptionDeleteFormCall(call: AppCallRequest): Promise<AppForm> {
    const i18nObj = configureI18n(call.context);
    const integrations: Subscription[] = await getIntegrationsList(call);

    if (!integrations.length) {
        throw new Exception(ExceptionType.MARKDOWN, i18nObj.__('binding.binding.command-delete-no-subscriptions'));
    }

    const subscriptionOptions: AppSelectOption[] = integrations.map((integration) => {
        return {
            label: i18nObj.__('binding.binding.command-delete-value', { integration: integration.integrationId, name: integration.ownerTeam.name, channelName: integration.channelName }),
            value: integration.integrationId,
        } as AppSelectOption;
    });

    const form: AppForm = {
        title: i18nObj.__('binding.binding.command-delete-title'),
        icon: OpsGenieIcon,
        submit: {
            path: Routes.App.CallPathSubscriptionDeleteSubmit,
            expand: {
                ...ExtendRequired,
                app: AppExpandLevels.EXPAND_ALL,
            },
        },
        fields: [
            {
                modal_label: i18nObj.__('binding.binding.label-delete'),
                name: SubscriptionDeleteForm.SUBSCRIPTION_ID,
                type: AppFieldTypes.STATIC_SELECT,
                is_required: true,
                position: 1,
                options: subscriptionOptions,
            },
        ],
    };

    return form;
}