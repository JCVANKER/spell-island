"""Helpers for writing lesson worlds (see README in this folder)."""

def T(id, name, model, pos, zh='', **k):
    d = {'id': id, 'name': name, 'zh': zh, 'model': model, 'pos': list(pos) if len(pos) == 3 else [pos[0], 0, pos[1]]}
    d.update(k); return d
def N(id, name, model, pos, voice, persona, greet, zh='', **k):
    d = T(id, name, model, pos, zh, **k); d.update({'voice': voice, 'persona': persona, 'greet': greet}); d.setdefault('radius', 0.8); return d
def Q(id, kind, skill, giver, titleZh, title, intro, model, done, **k):
    d = {'id': id, 'kind': kind, 'skill': skill, 'giver': giver, 'titleZh': titleZh, 'title': title, 'intro': intro, 'model': model, 'done': done}
    d.update(k); return d


def S(id, say, zh, pos, hidden=False):
    """a word star: say it near the star to collect it"""
    d = {'id': id, 'say': say, 'zh': zh, 'pos': list(pos)}
    if hidden: d['hidden'] = True
    return d

def Z(id, name, zh, pos, r):
    """a named area: a title card shows when the wizard walks in"""
    return {'id': id, 'name': name, 'zh': zh, 'pos': list(pos), 'r': r}
