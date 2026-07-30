// Description: Renders comment text with Facebook-style mention emphasis and optional profile actions.
import React, { useMemo } from 'react';
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import type { CommentMention } from '../../domain/types/reels.types';
import { splitCommentMentionSegments } from '../../application/utils/commentMentions';

export interface CommentMentionTextProps extends Omit<TextProps, 'children'> {
  text: string;
  mentions?: CommentMention[];
  mentionStyle?: StyleProp<TextStyle>;
  onPressMention?: (mention: CommentMention) => void;
}

const DEFAULT_MENTION_STYLE: TextStyle = {
  color: '#1877F2',
  fontWeight: '700',
};

export function CommentMentionText({
  text,
  mentions,
  mentionStyle,
  onPressMention,
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
        const canOpenProfile = Boolean(mention?.userId && onPressMention);
        return (
          <Text
            key={`${segment.text}-${index}`}
            style={[DEFAULT_MENTION_STYLE, mentionStyle]}
            accessibilityRole={canOpenProfile ? 'link' : undefined}
            onPress={
              canOpenProfile ? () => onPressMention!(mention!) : undefined
            }
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

export default CommentMentionText;
