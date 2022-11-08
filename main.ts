/**
 * player state
 */
/**
 * master state
 */
/**
 * Infection game
 * 
 * Flash all micro:bit will this script
 * 
 * Press A+B to enter master mode (1 per game)
 * 
 * Wait for players to be paired. The number of paired player will display on screen.
 * 
 * An icon will appear on player's screen.
 * 
 * Press A+B to start the infection game. The master will pick a random
 * 
 * player as patient zero.
 * 
 * A player will transmit the disease if close enough (RSSI)
 * 
 * and with a certain probability (TRANSMISSIONPROB).
 * 
 * During the incudation phase (INCUBATION), the player does not show any sign
 * 
 * of illness. After that phase, the sad face shows up.
 * 
 * The game will automatically stop once all players are dead or healthy. The master can
 * 
 * also press A+B again to stop the game.
 * 
 * Once the game is over, the micro:bit will show the player id (A,B,C...), health and
 * 
 * who infected him.
 * 
 * Icons used in the game:
 * 
 * Pairing: IconNames.Ghost,7
 * 
 * Paired: IconNames.Happy,
 * 
 * Dead: IconNames.Skull,
 * 
 * Sick: IconNames.Sad,
 * 
 * Incubating: IconNames.Confused,
 * 
 * Healthy: IconNames.Happy
 */
function allDead () {
    for (let r of players) {
        if (r.health != HealthState.Dead) {
            return false
        }
    }
    return true
}
function gameFace () {
    switch (state) {
        case GameState.Stopped:
            basic.showIcon(GameIcons.Pairing);
            break;
        case GameState.Pairing:
            if (playerIcon > -1)
                basic.showString(playerIcons[playerIcon]);
            else
                basic.showIcon(paired ? GameIcons.Paired : GameIcons.Pairing, 1);
            break;
        case GameState.Running:
            switch (health) {
                case HealthState.Dead:
                    basic.showIcon(GameIcons.Dead, 1);
                    break;
                case HealthState.Sick:
                    basic.showIcon(GameIcons.Sick, 1);
                    break;
                default:
                    basic.showIcon(GameIcons.Healthy, 1);
                    break;
            }
            break;
        case GameState.Over:
            // show id
            basic.showString(playerIcons[playerIcon]);
            basic.pause(2000);
            // show health
            switch (health) {
                case HealthState.Dead:
                    basic.showIcon(GameIcons.Dead, 2000);
                    break;
                case HealthState.Sick:
                    basic.showIcon(GameIcons.Sick, 2000);
                    break;
                case HealthState.Incubating:
                    basic.showIcon(GameIcons.Incubating, 2000);
                    break;
                default:
                    basic.showIcon(GameIcons.Healthy, 2000);
                    break;
            }
            // show how infected
            if (infectedBy > -1) {
                basic.showString(" INFECTED BY");
                basic.showString(playerIcons[infectedBy]);
                basic.pause(2000);
            } else {
                basic.showString(" PATIENT ZERO");
                basic.pause(2000);
            }
            // show score
            game.showScore();
            basic.pause(1000);
            break;
    }
}
function gameOver () {
    state = GameState.Over;
if (patientZero) {
        patientZero.show();
    }
}
input.onButtonPressed(Button.AB, function () {
    if (state == GameState.Stopped && !(master)) {
        master = true
        paired = true
        state = GameState.Pairing;
serial.writeLine("registered as master")
        radio.setTransmitPower(7)
        basic.showString("0")
        return;
    }
    if (!(master)) {
        return;
    }
    if (state == GameState.Pairing) {
        patientZero = players[Math.randomRange(0, players.length)]
        while (patientZero.health == HealthState.Healthy) {
            radio.sendValue("infect", patientZero.id)
            basic.pause(100)
        }
        state = GameState.Running;
serial.writeLine("" + (`game started ${players.length} players`))
        basic.showIcon(GameIcons.Dead);
    } else if (state == GameState.Running) {
        gameOver()
    }
})
// get a player instance (creates one as needed)
function player (id: number) {
    for (let p of players) {
        if (p.id == id) {
            return p
        }
    }
    let q = new Player();
q.id = id;
q.icon = (players.length + 1) % playerIcons.length;
q.health = HealthState.Healthy;
players.push(q)
    serial.writeLine("" + (`player ==> ${q.id}`))
    return q
}
let master = false
let infectedTime = 0
let paired = false
let players: Player[] = []
// time before showing symptoms
let INCUBATION = 20000
// time before dying off the disease
let DEATH = 40000
// db
let RSSI = -45
// % probability to transfer disease
let TRANSMISSIONPROB = 40
enum GameState {
    Stopped,
    Pairing,
    Running,
    Over
}
enum HealthState {
    Healthy,
    Incubating,
    Sick,
    Dead
}
const GameIcons = {
    Pairing: IconNames.Ghost,
    Paired: IconNames.Happy,
    Dead: IconNames.Skull,
    Sick: IconNames.Sad,
    Incubating: IconNames.Confused,
    Healthy: IconNames.Happy
}
let playerIcons = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
class Player {
    id: number;
    icon: number;
    health: HealthState;
    show() {
        basic.showString(playerIcons[this.icon]);
    }
}
let state = GameState.Stopped;
let patientZero: Player;
// who infected (playerIcon)
let infectedBy = -1
// local time when infection happened
// player icon and identity
let playerIcon = -1
let health = HealthState.Healthy;
radio.setGroup(42)
radio.setTransmitSerialNumber(true)
basic.showIcon(GameIcons.Pairing)
basic.forever(function () {
    if (master) {
        switch (state) {
            case GameState.Pairing:
                // tell each player they are registered
                for (const u of players) {
                    radio.sendValue("paired", u.id);
                    radio.sendValue("i" + u.id, u.icon);
                }
                serial.writeLine(`pairing ${players.length} players`);
                basic.pause(500);
                break;
            case GameState.Running:
                for (const v of players) {
                    radio.sendValue("h" + v.id, v.health);
                }
                break;
            case GameState.Over:
                if (patientZero)
                    patientZero.show();
                break;
        }
radio.sendValue("state", state)
    } else {
        switch (state) {
            case GameState.Pairing:
                // broadcast player id
                if (playerIcon < 0)
                    radio.sendValue("pair", control.deviceSerialNumber());
                else if (infectedBy > -1)
                    radio.sendValue("health", health);
                break;
            case GameState.Running:
                // update health status
                if (health != HealthState.Healthy && input.runningTime() - infectedTime > DEATH)
                    health = HealthState.Dead;
                else if (health != HealthState.Healthy && input.runningTime() - infectedTime > INCUBATION)
                    health = HealthState.Sick;
                // transmit disease
                if (health == HealthState.Incubating || health == HealthState.Sick)
                    radio.sendValue("transmit", playerIcon);
                radio.sendValue("health", health);
                break;
        }
gameFace()
    }
})
