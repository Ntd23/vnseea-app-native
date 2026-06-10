// Description: Relays mobile LiveKit direct and group call socket events between foreground users.
  const readString = value => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  };

  const readNumber = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const attachSocketToUser = (ctx, sessionId, userId, socket) => {
    if (!sessionId || !userId) return;
    ctx.socketIdUserHash[socket.id] = sessionId;
    ctx.userHashUserId[sessionId] = userId;

    const currentSockets = ctx.userIdSocket[userId] || [];
    if (!currentSockets.some(item => item && item.id === socket.id)) {
      currentSockets.push(socket);
      ctx.userIdSocket[userId] = currentSockets;
    }

    socket.join(userId);
  };

  const resolveSocketUserId = async (ctx, data, socket) => {
    const dataSessionId = readString(data && data.user_id);
    if (dataSessionId && ctx.userHashUserId[dataSessionId]) {
      return Number(ctx.userHashUserId[dataSessionId]);
    }

    const socketSessionId = ctx.socketIdUserHash[socket.id];
    if (socketSessionId && ctx.userHashUserId[socketSessionId]) {
      return Number(ctx.userHashUserId[socketSessionId]);
    }

    if (dataSessionId && ctx.wo_appssessions) {
      const session = await ctx.wo_appssessions.findOne({
        attributes: ['user_id'],
        where: {
          session_id: dataSessionId,
        },
        raw: true,
      });
      const userId = readNumber(session && session.user_id);
      if (userId) {
        attachSocketToUser(ctx, dataSessionId, userId, socket);
        return userId;
      }
    }

    return 0;
  };

  const mapPeer = user => {
    if (!user) {
      return {
        id: '',
        name: 'User',
        avatar: '',
        username: '',
      };
    }

    const firstName = readString(user.first_name).trim();
    const lastName = readString(user.last_name).trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      id: readString(user.user_id),
      name: fullName || readString(user.username) || 'User',
      avatar: readString(user.avatar),
      username: readString(user.username),
    };
  };

  const loadPeer = async (ctx, userId) => {
    if (!userId) return mapPeer(null);
    const user = await ctx.wo_users.findOne({
      attributes: ['user_id', 'username', 'first_name', 'last_name', 'avatar'],
      where: {
        user_id: userId,
      },
      raw: true,
    });
    return mapPeer(user);
  };

  const emitToRecipient = (ctx, io, recipientId, eventName, payload) => {
    const toId = Number(recipientId);
    if (!toId) return;
    const room =
      (io.sockets.adapter.rooms && io.sockets.adapter.rooms[String(toId)]) ||
      (io.sockets.adapter.rooms && io.sockets.adapter.rooms[toId]);
    const roomSocketCount =
      room && room.sockets ? Object.keys(room.sockets).length : 0;
    const trackedSocketCount = (ctx.userIdSocket[toId] || []).length;
    console.log(
      '[livekit_emit]',
      JSON.stringify({
        event: eventName,
        recipient_id: String(toId),
        call_id: payload && payload.call_id,
        room_sockets: roomSocketCount,
        tracked_sockets: trackedSocketCount,
      }),
    );
    io.to(toId).emit(eventName, payload);

    const sockets = ctx.userIdSocket[toId] || [];
    for (const userSocket of sockets) {
      if (userSocket && typeof userSocket.emit === 'function') {
        userSocket.emit(eventName, payload);
      }
    }
  };

  const emitToGroup = (io, groupId, eventName, payload) => {
    const roomName = `group${readNumber(groupId)}`;
    if (roomName === 'group0') return;
    const room =
      (io.sockets.adapter.rooms && io.sockets.adapter.rooms[roomName]) || null;
    const roomSocketCount =
      room && room.sockets ? Object.keys(room.sockets).length : 0;
    console.log(
      '[livekit_group_emit]',
      JSON.stringify({
        event: eventName,
        group_id: String(groupId),
        call_id: payload && payload.call_id,
        room_sockets: roomSocketCount,
      }),
    );
    io.to(roomName).emit(eventName, payload);
  };

  const readRecipientIds = value => {
    if (!Array.isArray(value)) return [];
    const ids = [];
    for (const item of value) {
      const id = readNumber(item);
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  };

  const LiveKitCallCreatedController = async (ctx, data, io, socket) => {
    const senderId = await resolveSocketUserId(ctx, data, socket);
    const recipientId = readNumber(data && data.to_id);
    const callId = readString(data && data.call_id);
    if (!senderId || !recipientId || !callId || senderId === recipientId) return;

    const peer = await loadPeer(ctx, senderId);
    emitToRecipient(ctx, io, recipientId, 'livekit_call_incoming', {
      call_id: callId,
      call_type: readString(data && data.call_type) === 'audio' ? 'audio' : 'video',
      provider: 'livekit',
      room_name: readString(data && data.room_name),
      peer,
    });
  };

  const LiveKitCallAnsweredController = async (ctx, data, io, socket) => {
    const senderId = await resolveSocketUserId(ctx, data, socket);
    const recipientId = readNumber(data && data.to_id);
    const callId = readString(data && data.call_id);
    if (!senderId || !recipientId || !callId || senderId === recipientId) return;

    emitToRecipient(ctx, io, recipientId, 'livekit_call_answered', {
      call_id: callId,
      call_type: readString(data && data.call_type) === 'audio' ? 'audio' : 'video',
      status: 'answered',
      active: true,
      finished: false,
      peer_id: String(senderId),
      started_at: readNumber(data && data.started_at),
      started_at_ms: readNumber(data && data.started_at_ms),
      server_now: readNumber(data && data.server_now) || Math.floor(Date.now() / 1000),
      server_now_ms: readNumber(data && data.server_now_ms) || Date.now(),
      elapsed: readNumber(data && data.elapsed),
      elapsed_ms: readNumber(data && data.elapsed_ms),
    });
  };

  const LiveKitCallClosedController = async (ctx, data, io, socket) => {
    const senderId = await resolveSocketUserId(ctx, data, socket);
    const recipientId = readNumber(data && data.to_id);
    const callId = readString(data && data.call_id);
    if (!senderId || !recipientId || !callId || senderId === recipientId) return;

    const status = readString(data && data.status) || 'ended';
    const eventName = status === 'declined' ? 'livekit_call_declined' : 'livekit_call_closed';
    emitToRecipient(ctx, io, recipientId, eventName, {
      call_id: callId,
      call_type: readString(data && data.call_type) === 'audio' ? 'audio' : 'video',
      status,
      active: false,
      finished: true,
      peer_id: String(senderId),
      duration: readNumber(data && data.duration),
    });
  };

  const PublishLiveKitCallEventController = async (ctx, data, io) => {
    const context = readString(data && data.context);
    const event = readString(data && data.event);
    const callId = readString(data && data.call_id);
    const callType = readString(data && data.call_type) === 'audio' ? 'audio' : 'video';
    if (context === 'group') {
      const groupId = readNumber(data && data.group_id);
      const recipientIds = readRecipientIds(data && data.recipient_ids);
      console.log(
        '[livekit_group_publish_received]',
        JSON.stringify({
          event,
          call_id: callId,
          group_id: String(groupId || ''),
          recipient_ids: recipientIds.map(String),
        }),
      );
      if (!event || !callId || !groupId) return false;

      const payload = {
        call_id: callId,
        group_id: String(groupId),
        call_type: callType,
        provider: 'livekit',
        room_name: readString(data && data.room_name),
        status: readString(data && data.status),
        group: data && data.group && typeof data.group === 'object' ? data.group : undefined,
        caller: data && data.caller && typeof data.caller === 'object' ? data.caller : undefined,
        participants: Array.isArray(data && data.participants) ? data.participants : [],
        participant_count: readNumber(data && data.participant_count),
        started_at: readNumber(data && data.started_at),
        started_at_ms: readNumber(data && data.started_at_ms),
        server_now: readNumber(data && data.server_now) || Math.floor(Date.now() / 1000),
        server_now_ms: readNumber(data && data.server_now_ms) || Date.now(),
        elapsed: readNumber(data && data.elapsed),
        elapsed_ms: readNumber(data && data.elapsed_ms),
        ring_mode: readString(data && data.ring_mode),
        left_user_id: readString(data && data.left_user_id),
        declined_user_id: readString(data && data.declined_user_id),
      };

      if (event === 'incoming') {
        for (const recipientId of recipientIds) {
          emitToRecipient(ctx, io, recipientId, 'livekit_group_call_incoming', payload);
        }
        return true;
      }

      const eventName = event === 'closed'
        ? 'livekit_group_call_closed'
        : 'livekit_group_call_sync';
      emitToGroup(io, groupId, eventName, payload);
      return true;
    }

    const callerId = readNumber(data && data.from_id);
    const calleeId = readNumber(data && data.to_id);
    console.log(
      '[livekit_publish_received]',
      JSON.stringify({
        event,
        call_id: callId,
        from_id: String(callerId || ''),
        to_id: String(calleeId || ''),
      }),
    );
    if (!event || !callId || !callerId || !calleeId) return false;

    if (event === 'incoming') {
      const peer =
        data && data.peer && typeof data.peer === 'object'
          ? data.peer
          : await loadPeer(ctx, callerId);
      emitToRecipient(ctx, io, calleeId, 'livekit_call_incoming', {
        call_id: callId,
        call_type: callType,
        provider: 'livekit',
        room_name: readString(data && data.room_name),
        peer,
      });
      return true;
    }

    const basePayload = {
      call_id: callId,
      call_type: callType,
      status: readString(data && data.status),
      active: data && data.active,
      finished: data && data.finished,
      peer_id: readString(data && data.peer_id),
      started_at: readNumber(data && data.started_at),
      started_at_ms: readNumber(data && data.started_at_ms),
      server_now: readNumber(data && data.server_now) || Math.floor(Date.now() / 1000),
      server_now_ms: readNumber(data && data.server_now_ms) || Date.now(),
      elapsed: readNumber(data && data.elapsed),
      elapsed_ms: readNumber(data && data.elapsed_ms),
      duration: readNumber(data && data.duration),
    };
    const eventName =
      event === 'answered'
        ? 'livekit_call_answered'
        : event === 'declined'
          ? 'livekit_call_declined'
          : 'livekit_call_closed';

    emitToRecipient(ctx, io, callerId, eventName, basePayload);
    emitToRecipient(ctx, io, calleeId, eventName, basePayload);
    return true;
  };

  module.exports = {
    LiveKitCallCreatedController,
    LiveKitCallAnsweredController,
    LiveKitCallClosedController,
    PublishLiveKitCallEventController,
  };
