/* TODO:

  This is a copy of server/common/avalonlib.js

  I can't figure out how to combine them
*/

exports.ROLES = [
    { name: 'MERLIN',
      team: 'good',
      sees: ['MORGANA', 'OBERON', 'EVIL MINION'],
      description: 'Merlin sees all evil people (except for Mordred), but can also be assassinated.',
      selected: true,
      selectable: true
    },
    { name: 'PERCIVAL',
      team: 'good',
      sees: [ 'MERLIN', 'MORGANA' ],
      description: "Percival can see Merlin and Morgana but does not know which one is which.",
      selected: true,
      selectable: true
    },
    { name: 'LOYAL FOLLOWER',
      team: 'good',
      description: 'Loyal Follower is a genuinely good person.',
      filler: true,
      sees: [],
      selectable: false,    
      selected: false  
    },
    { name: 'MORGANA',
      team: 'evil',
      assassinationPriority: 2,
      sees: [ 'MORDRED', 'EVIL MINION' ],
      description: "Morgana appears indistinguishable from Merlin to Percival. She sees other evil people (except Oberon)",
      selected: true,
      selectable: true,
    },
    { name: 'MORDRED',
      team: 'evil',
      description: "Mordred is invisible to Merlin. Mordred can see other evil people (except Oberon)",
      assassinationPriority: 3,
      sees: ['MORGANA', 'EVIL MINION'],
      selected: false,
      selectable: true
    },
    { name: 'OBERON',
      description: 'Oberon does not see anyone on his team and his teammates do not see him.',
      team: 'evil',
      assassinationPriority: 1,
      sees: [],
      selected: false,
      selectable: true
    },
    { name: 'EVIL MINION',
      description: 'Evil Minion is pretty evil. He can see other evil people (except Oberon)',
      team: 'evil',
      assassinationPriority: 4,
      filler: true,
      sees: ['MORGANA', 'MORDRED', 'EVIL MINION'],
      selected: false,
      selectable: false
     }
];

exports.getNumEvilForGameSize = function(numPlayers) {
    return { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 }[numPlayers];
}
