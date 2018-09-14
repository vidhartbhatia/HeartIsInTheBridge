import time

from argparse import ArgumentParser
from argparse import ArgumentDefaultsHelpFormatter

import eventloop

from bridge import Bridge
from bridge import CombinedBridge
from bridge import PauschBridge
from bridge import SimulatedBridge


START_SEQ_OFFSET = 40
WIDTH = 20

COLORS = (
( 77.0/255.0, 157.0/255.0, 224.0/255.0),
(225.0/255.0,  85.0/255.0,  84.0/255.0),
(225.0/255.0, 188.0/255.0,  41.0/255.0),
( 59.0/255.0, 178.0/255.0, 115.0/255.0),
(119.0/255.0, 104.0/255.0, 174.0/255.0),
)


################################################################################
# State representation
################################################################################

class Client(object):

  next_color = 0

  def __init__(self, cid):
    self.cid = cid
    self.last_beat = 0
    self.color = COLORS[Client.next_color]
    Client.next_color += 1
    Client.next_color %= len(COLORS)


class State(object):
  '''All the state'''

  def __init__(self):
    self.now = 0
    self.now_last = 0
    self.clients = [None for _ in range((Bridge.END_SEQ-Bridge.START_SEQ)/WIDTH)]
    self.num_free_panels = (Bridge.END_SEQ-Bridge.START_SEQ)/WIDTH

  def get_cid(self, cid):
    idx = self.get_cid_index(cid)
    if idx == -1:
      return False
    return self.clients[idx]

  def get_cid_index(self, cid):
    for i, client in enumerate(self.clients):
      if client is not None and client.cid == cid:
        return i
    return -1

  def num_free(self):
    return self.num_free_panels

  def place_next(self, new_client):
    if self.num_free_panels == 0:
      return False

    left_idx = 0
    for i, client in enumerate(self.clients):
      if client is None:
        left_idx = i
        break

    right_idx = 0
    for i, client in enumerate(reversed(self.clients)):
      if client is None:
        right_idx = len(self.clients) - i - 1
        break

    if left_idx < len(self.clients) - right_idx - 1:
      self.clients[left_idx] = new_client
    else:
      self.clients[right_idx] = new_client

    self.num_free_panels -= 1
    return True

  def remove_client(self, client):
    ''' Assumes that the client must be in our self.clients list '''
    seen = None
    for i in range(len(self.clients)):
      if self.clients[i] == client:
        self.clients[i] = None
        seen = i
    if seen is None:
      return False
    else:
      if seen < len(self.clients) / 2:
        for i in range(seen+1, len(self.clients)//2+1):
          self.clients[i-1] = self.clients[i]
          self.clients[i] = None
      else:
        for i in range(seen-1, len(self.clients)//2-1, -1):
          self.clients[i+1] = self.clients[i]
          self.clients[i] = None
    self.num_free_panels+=1
    return True


################################################################################
# Event handlers
################################################################################

def on_connected(state, cid):
  '''Handle a client connecting.'''
  print('connected', cid)
  cl = Client(cid)
  if state.num_free() > 0:
    state.place_next(cl)
    broadcast_state(state)
    print('connect', state.num_free())

def on_disconnected(state, cid):
  '''Handle a client disconnecting.'''
  print('disconnected', cid)
  client = state.get_cid(cid)
  if client is not None:
    state.remove_client(client)
    broadcast_state(state)
    print('disconnect', state.num_free())

def on_heartbeat(state, cid):
  '''Handle a HeartBeat event.'''
  client = state.get_cid(cid)
  if client:
    print 'beat', cid
    client.last_beat = time.time()
    broadcast_beat(state, cid)

def on_timer(state):
  '''Handle a TimerTick event.'''
  state.now_last = state.now
  state.now = time.time()

def broadcast_state(state):
  data = [client.color if client is not None else None for client in state.clients]
  eventloop.broadcast('colors', data)
  send_indicies(state);

def broadcast_beat(state, beat_cid):
  idx = state.get_cid_index(beat_cid)
  if idx != -1:
    eventloop.broadcast('beat', idx)

def send_indicies(state):
  for i, client in enumerate(state.clients):
    if client is not None:
      eventloop.emit(client.cid, 'self_index', i)

################################################################################
# State visualization
################################################################################

def draw_state(state, bridge):
  '''Translate the supplied state object into a lighting show on the bridge.'''
  for client_idx, client in enumerate(state.clients):
    if client is None:
      color = (0, 0, 0)
      w = 0.0
    else:
      diff = (state.now - client.last_beat) / 2.0
      diff = min(diff, 0.4)
      diff = 1.0 - diff
      color = client.color
      w = diff
    if state.num_free() == 0:
      w = 1.0 - min((state.now % 1.0)/2.0, 0.4)
    panels = range(client_idx*WIDTH, client_idx*WIDTH+WIDTH)
    bridge.set_top(*color, w=w, panels=panels)
    bridge.set_bottom(*color, w=w, panels=panels)

def get_args():
  parser = ArgumentParser(description='Run the bridge heart monitor server', formatter_class=ArgumentDefaultsHelpFormatter)
  parser.add_argument('--simulator', action='store_true', dest='simulate', help='Run the bridge simulator')
  parser.add_argument('--no-pausch', action='store_false', dest='pausch', help='Don\'t run on the Pausch bridge')
  parser.add_argument('--host', action='store', type=str, default='api.bridge.kevinzheng.com', dest='listen_host', help='Host to listen on')
  parser.add_argument('--port', action='store', type=int, default=43414, dest='listen_port', help='Port to listen on')
  parser.add_argument('--no-https', action='store_false', dest='listen_https', help='Don\'t use HTTPS')
  parser.add_argument('--priv-key', action='store', type=str, default='./certs/privkey.pem', dest='listen_privkey', help='Path to private key')
  parser.add_argument('--pub-key', action='store', type=str, default='./certs/fullchain.pem', dest='listen_pubkey', help='Path to public key')
  return parser.parse_args()

def main():
  args = get_args()

  # initialize the state object
  state = State()

  # initialize the bridges
  bridges = []
  if args.simulate: bridges.append(SimulatedBridge())
  if args.pausch: bridges.append(PauschBridge())
  bridge = CombinedBridge(bridges)

  # spin up the event loop
  eventloop.start(bridge, state,
    listen_host    = args.listen_host,
    listen_port    = args.listen_port,
    listen_https   = args.listen_https,
    listen_privkey = args.listen_privkey,
    listen_pubkey  = args.listen_pubkey,
    draw_fn        = draw_state,
    timer_fn       = on_timer,
    handlers       = {
      'beat'      : on_heartbeat,
      'connect'   : on_connected,
      'disconnect': on_disconnected,
    })

if __name__ == '__main__':
  main()
