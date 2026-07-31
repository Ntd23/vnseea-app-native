// Description: Renders comment text with Facebook-style mention emphasis and optional profile actions.
import React, { useMemo } from 'react';
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import type { CommentMention } from '../../domain/types/reels.types';
import {
  getRenderedCommentMentionLabel,
  splitCommentMentionSegments,
} from '../../application/utils/commentMentions';

export interface CommentMentionTextProps extends Omit<TextProps, 'children'> {
  text: string;
  mentions?: CommentMention[];
  mentionStyle?: StyleProp<TextStyle>;
  onPressMention?: (mention: CommentMention) => void;
  onPressUnresolvedMention?: (label: string) => void;
}

const DEFAULT_MENTION_STYLE: TextStyle = {
  color: APP_BRAND_COLOR,
  fontWeight: '700',
};

export function CommentMentionText({
  text,
  mentions,
  mentionStyle,
  onPressMention,
  onPressUnresolvedMention,
  ...textProps
}: CommentMentionTextProps) {
  const segments = useMemo(
    () => splitCommentMentionSegments(text, mentions),
    [mentions, text],
  );

  return (
    <Text {...textProps}>
      {segments.map((segment, index) => {
        if (!segment.isMention) return segment.text;

        const mention = segment.mention;
        const renderedLabel = getRenderedCommentMentionLabel(
          segment.text,
          mention,
        );
        const canOpenKnownProfile = Boolean(
          mention?.userId && onPressMention,
        );
        const canResolveProfile = Boolean(onPressUnresolvedMention);
        const canOpenProfile = canOpenKnownProfile || canResolveProfile;
        return (
          <Text
            key={`${segment.text}-${index}`}
            style={[DEFAULT_MENTION_STYLE, mentionStyle]}
            accessibilityRole={canOpenProfile ? 'link' : undefined}
            accessibilityLabel={
              canOpenProfile ? `Mở trang cá nhân ${renderedLabel}` : undefined
            }
            onPress={
              canOpenKnownProfile
                ? () => onPressMention!(mention!)
                : canResolveProfile
                  ? () => onPressUnresolvedMention!(renderedLabel)
                  : undefined
            }
          >
            {renderedLabel}
          </Text>
        );
      })}
    </Text>
  );
}

export default CommentMentionText;
