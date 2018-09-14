import time

from argparse import ArgumentParser
from argparse import ArgumentDefaultsHelpFormatter

import eventloop
import events

from bridge import Bridge
from bridge import CombinedBridge
from bridge import PauschBridge
from bridge import SimulatedBridge


START_SEQ_OFFSET = 40
WIDTH = 14

COLORS = (
(249.0/255.0, 38.0/255.0,114.0/255.0),
(166.0/255.0,226.0/255.0, 46.0/255.0),
(102.0/255.0,217.0/255.0,239.0/255.0),
(253.0/255.0,151.0/255.0, 31.0/255.0),
(174.0/255.0,129.0/255.0,255.0/255.0),
)

class Client(object):

  next_color = 0

  def __init__(self, cid):
    self.cid = cid
    self.last_beat = 0
    self.color = Client.next_color
    Client.next_color += 1
    Client.next_color %= len(COLORS)


class State(object):
  '''All the state'''

  def __init__(self):
    self.now = 0
    self.clients = [None for _ in range((Bridge.END_SEQ-Bridge.START_SEQ)/WIDTH)]
    self.num_free_panels = (Bridge.END_SEQ-Bridge.START_SEQ)/WIDTH

  def get_cid(self, cid):
    for client in self.clients:
      if client.cid == cid:
        return client
    assert False

  def get_num_free_panels(self):
    return self.num_free_panels

  def place_next(self, client):
    if self.num_free_panels % 2 == 0:
      for i in range(len(self.clients)):
        if self.clients[i] is None:
          self.clients[i] = client
          self.num_free_panels-=1
          return True
    else:
      for i in range(len(self.clients)):
        if self.clients[len(self.clients)-i-1] is None:
          self.clients[len(self.clients)-i-1] = client
          self.num_free_panels-=1
          return True
    return False

  def remove_client(self, client):
    ''' Assumes that the client must be in our self.clients list '''
    seen = None
    for i in range(len(self.clients)):
      if self.clients[i] == client:
        self.clients[i] = None
        seem = i
    if seen is None:
      return False
    else:
      if seen <= len(self.clients) / 2:
        for i in range(seen+1, 1+len(self.clients)//2):
          self.clients[i-1] = self.clients[i]
          self.clients[i] = None
      else:
        for i in range(len(self.clients)-1, 1+len(self.clients)//2, -1):
          self.clients[i+1] = self.clients[i]
          self.clients[i] = None
    self.num_free_panels+=1
    return True

def on_connected(state, event):
  '''Handle a client connecting.'''
  print('connected', event.cid)
  cl = Client(event.cid)

  next_panel = START_SEQ_OFFSET
  while next_panel in [a for b in state.panels_in_use.values() for a in b]:
    next_panel += 1
  state.panels_in_use[event.cid] = range(next_panel, next_panel + WIDTH)
  state.last_beat[event.cid] = 0
  state.colors[event.cid] = COLORS[state.next_color]
  state.next_color += 1
  state.next_color %= len(COLORS)

def on_disconnected(state, event):
  '''Handle a client disconnecting.'''
  print('disconnected', event.cid)
  del state.last_beat[event.cid]
  del state.panels_in_use[event.cid]

def on_heartbeat(state, event):
  '''Handle a HeartBeat event.'''
  print('heartbeat')
  state.last_beat[event.cid] = time.time()

def on_timer(state, event):
  '''Handle a TimerTick event.'''
  state.now = time.time()

def draw_state(state, bridge):
  '''Translate the supplied state object into a lighting show on the bridge.'''
  for cid in state.last_beat.keys():
    diff = state.now - state.last_beat[cid]
    diff = min(diff, 1.0)
    diff = 1.0 - diff
    bridge.set_bottom(*state.colors[cid], w=diff, panels=state.panels_in_use[cid])
    bridge.set_top(*state.colors[cid], w=diff, panels=state.panels_in_use[cid])

def get_args():
  parser = ArgumentParser(description='Run the bridge heart monitor server', formatter_class=ArgumentDefaultsHelpFormatter)
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
  bridges.append(SimulatedBridge())
  if args.pausch: bridges.append(PauschBridge())
  bridge = CombinedBridge(bridges)

  # register all of the handlers
  eventloop.register_handler(events.TimerTick, on_timer)
  eventloop.register_handler(events.HeartBeat, on_heartbeat)
  eventloop.register_handler(events.Connected, on_connected)
  eventloop.register_handler(events.Disconnected, on_disconnected)
  eventloop.register_draw(draw_state)

  # spin up the event loop
  eventloop.start(bridge, state,
    listen_host=args.listen_host,
    listen_port=args.listen_port,
    listen_https=args.listen_https,
    listen_privkey=args.listen_privkey,
    listen_pubkey=args.listen_pubkey)

if __name__ == '__main__':
  main()
