const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Chat message reaction contract', () => {
  it('uses the Feed reaction picker, badge and double-tap Like in Chat', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const ui = read(
      'src/messages/presentation/components/MessageReactions.tsx',
    );

    expect(ui).toContain('FEED_REACTION_IMAGES');
    expect(ui).toContain('FEED_REACTION_TYPES.map');
    expect(chat).toContain('<MessageReactionPicker');
    expect(chat).toContain('<MessageReactionBadge');
    expect(chat).toContain("message.reactions.myReaction === 'like'");
    expect(chat).toContain('onDoubleTap={handleDoubleTapMessage}');
  });

  it('merges reaction polling and sends set/remove through one repository route', () => {
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(viewModel).toContain('areMessageReactionSummariesEqual');
    expect(viewModel).toContain('applyOptimisticMessageReaction');
    expect(repository).toContain('apiRoutes.messages.react');
    expect(repository).toContain("action: 'set'");
    expect(repository).toContain("action: 'remove'");
  });

  it('keeps the mirrored backend authorization and canonical snapshot', () => {
    const endpoint = read('phtml/api/v2/endpoints/react_message.php');
    const exceptions = read(
      'phtml/api/v2/endpoints/Exceptions/exceptions.php',
    );
    const functions = read('phtml/assets/includes/functions_one.php');

    expect(exceptions).toContain('function VNSEEA_CanReactToMessage');
    expect(endpoint).toContain('VNSEEA_CanReactToMessage($message_id)');
    expect(endpoint).toContain("$action === 'remove'");
    expect(endpoint).toContain('startTransaction()');
    expect(functions).toContain(
      'function VNSEEA_GetMessageReactionSummary',
    );
  });
});
