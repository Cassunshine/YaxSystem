const scene = game.scenes.getName(scope.name);

await scene.update({['grid.units'] : 'tiles', ['grid.distance'] : 1});