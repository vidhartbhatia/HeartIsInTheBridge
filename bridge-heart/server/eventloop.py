import socketio
import eventlet
import time

sio = socketio.Server()

_UPDATE_HZ = 30


def render_forever(state, bridge, draw_fn, timer_fn):
  '''Redraw the bridge periodically'''
  while True:
    start = time.time()

    timer_fn(state)
    draw_fn(state, bridge)
    bridge.render()

    end = time.time()
    wait = (1.0/_UPDATE_HZ) - (end-start)
    wait = max(wait, 0.0)
    eventlet.sleep(wait)

def emit(sid, event_name, message):
  sio.emit(event_name, message, room=sid)

def broadcast(event_name, message):
  sio.emit(event_name, message, room='all')

def start(
    bridge,
    state,
    listen_host='',
    listen_port=8000,
    listen_https=False,
    listen_privkey='',
    listen_pubkey='',
    handlers=None,
    timer_fn=None,
    draw_fn=None,
    ):
  '''Spin up the event loop'''
  assert handlers is not None
  assert draw_fn is not None
  assert timer_fn is not None

  # register the handlers
  for event, handler in handlers.iteritems():
    if event == 'connect':
      def handle_connect(sid, environ, event=event):
        sio.enter_room(sid, 'all')
        handlers[event](state, sid)
      sio.on(event, handle_connect)

    elif event == 'disconnect':
      def handle_disconnect(sid, event=event):
        sio.leave_room(sid, 'all')
        handlers[event](state, sid)
      sio.on(event, handle_disconnect)

    else:
      def handle_message(sid, data, event=event):
        handlers[event](state, sid)
      sio.on(event, handle_message)

  # initialize the server
  app = socketio.Middleware(sio)
  server = eventlet.listen((listen_host, listen_port))
  if listen_https:
    server = eventlet.wrap_ssl(
      server,
      certfile=listen_pubkey,
      keyfile=listen_privkey,
      server_side=True)

  # spin up the main event loop
  eventlet.spawn(render_forever, state, bridge, draw_fn, timer_fn)
  eventlet.wsgi.server(server, app, log_output=False)
