import { Client, Events, GuildMember, VoiceState } from 'discord.js';
import { FeatureSingleton } from '../../shared/singleton/feature.singleton';
import { BotEvent } from './types/bot-event.type';
import { Context } from '../../shared/classes/context';
import { UserUtil } from '../../shared/utils/user.util';
import { Logger } from '../../shared/classes/logger';

const logger: Logger = new Logger(new Context('VOICE-STATE-UPDATE-EVENT'));

export const event: BotEvent = {
    name: Events.VoiceStateUpdate,
    async execute(_client: Client, _oldState: VoiceState, newState: VoiceState): Promise<void> {
        const feature: FeatureSingleton = FeatureSingleton.instance;
        if (feature.data.auto_disconnect && newState.channelId) {
            const targetUser: GuildMember = await UserUtil.getGuildMemberFromGuild(newState.guild, feature.data.auto_disconnect);
            logger.debug(`Disconnect user {} because auto-disconnect set for him`, targetUser.displayName);
            await targetUser.voice.disconnect();
        }
    },
};
