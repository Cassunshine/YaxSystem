for (const combatant of game.combat.turns) {
    const actor = game.actors.get(combatant.actorId);
    if (actor == null) continue;

    // Loop through each item of the actor
    for (const item of actor.items) {

        //console.log(item);

        // Check if the item has a cooldown
        if (item.system.props.cooldown != null && item.system.props.cooldown > 0) {
            // Reduce the cooldown by 1
            let newCd = item.system.props.cooldown - 1;

            await item.update({['system.props.cooldown'] : newCd});
        }
    }
}