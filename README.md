# Neutron.js

Neutron.js is a JavaScript port of an Objective-C implementation of the abstract game "Neutron." The game features an asymmetric board setup, where the goal is to move the neutron piece to the opponent's home row while strategically positioning your pieces to block the opponent's neutron. 

## About the Original Game

The original rules of Neutron were published in *Games & Puzzles* magazine by Robert Kraus in 1978. The game features a 5x5 board and involves two players, one controlling white pieces and the other controlling black. The aim is to move the neutron to the opponent's back row or to block all possible moves of the opponent’s neutron. The game is remarkable due to its easy-to-learn rules and complex strategy.

More information about the original game can be found [here](https://www.di.fc.ul.pt/~jpn/gv/neutron.htm).

## About the Port

This project is a JavaScript port of the iOS version of Neutron, which was released by Doug Sartori in January 2011. The iOS version was a faithful implementation of the game and was downloaded thousands of times before it was eventually delisted from the App Store.

## Repository

The full source code for Neutron.js can be found on GitHub:

[https://github.com/dsartori/neutron-js](https://github.com/dsartori/neutron-js)

## Running Locally

ES modules require a server; opening `index.html` directly from disk will not work. Serve the repository root with any static file server, for example:

```bash
npx http-server -p 8080 .
```

Then visit http://localhost:8080 in your browser.

## Running the Game with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/dsartori/neutron-js.git
   ```
2. Navigate into the project directory:
   ```bash
   cd neutron-js
   ```
3. Build the Docker image:
   ```bash
   docker build -t neutron .
   ```
4. Run the Docker container:
   ```bash
   docker run --rm --name neutron-instance -p 8080:8080 neutron
   ```
5. Visit http://localhost:8080 in your browser to play the game.

The image serves only the files listed under Deployment.

## Running Tests

```bash
cd tests
npm install
npm test
```

Tests cover the game engine, a jsdom smoke test of the UI, and a full AI game played through the click handlers. The suite requires a recent Node.js (18 or later).

## Debug Logging

The game can log AI decisions to the browser console. Enable it with either of these before playing:

- Add `?debug=1` to the URL.
- Run `localStorage.setItem('neutronDebug', '1')` in the console and reload.

When enabled, each AI move logs its search depth, the candidate count, the size of the tied best-move set, elapsed time, and the top-ranked candidates with their scores. Applied moves log a line each, and the console warns when the side to move can slide the neutron onto an edge row.

The flag travels into the AI worker through the search snapshot, so worker-computed and synchronous searches both log. Disable it with `localStorage.removeItem('neutronDebug')`.


## Deployment
Deploy the following files and folders to the web server of your choice:
- img/
- constants.js
- favicon.ico
- index.html
- neutron.js
- style.css
- ui.js
- ai-worker.js

