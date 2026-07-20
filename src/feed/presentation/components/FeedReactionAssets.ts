// Description: Canonical reaction visuals shared by Feed and every surface
// that renders the six supported post reactions.
import type { ImageSourcePropType } from 'react-native';
import {
  ALL_REACTION_TYPES,
  isReactionType,
  type ReactionType,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';

export const FEED_REACTION_TYPES: readonly ReactionType[] = ALL_REACTION_TYPES;

export const FEED_REACTION_IMAGES: Record<ReactionType, ImageSourcePropType> = {
  like: require('../../../assets/reactions/reactions_like.png'),
  love: require('../../../assets/reactions/reactions_love.png'),
  haha: require('../../../assets/reactions/reactions_haha.png'),
  wow: require('../../../assets/reactions/reactions_wow.png'),
  sad: require('../../../assets/reactions/reactions_sad.png'),
  angry: require('../../../assets/reactions/reactions_angry.png'),
};

export const FEED_REACTION_COLORS: Record<ReactionType, string> = {
  like: '#0866ff',
  love: '#f33e58',
  haha: '#f7b125',
  wow: '#f7b125',
  sad: '#f7b125',
  angry: '#e9710f',
};

export function isFeedReactionType(value: string): value is ReactionType {
  return isReactionType(value);
}
