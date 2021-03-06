import Player from "../../shared/player";

const co = require("co");
const NodeCache = require("node-cache");

export default class PlayersController {
	constructor(collection) {
		this.collection = collection;

		this._userCache = new NodeCache({
			stdTTL: 180,
			checkPeriod: 200,
			useClones: false
		});

		this._userCache.on("del", (k, v) => {
			co(this.save(v));
		});
	}

	* find(steamid) {
		let player = this._userCache.get(steamid);
		if (!player) {
			let cursor = this.collection.find({
				_id: steamid
			});
			let player = yield cursor.hasNext() ? yield cursor.next() : null;
			if (player) {
				player = Player.fromDocument(player);
				this._userCache.set(steamid, player);
			} else {
				return null;
			}
		}
		this._userCache.ttl(steamid, 180);
		return player;
	}

	* save(player) {
		let copy = {};
		Object.assign(copy, player);
		yield this.collection.update({
			_id: copy._id
		}, {
			match: copy.match,
			auth: copy.auth,
		});
	}

	* stop() {
		let keys = this._userCache.keys();
		for(let key of keys) {
			let user = this._userCache.get(key);
			yield this.save(user);
		}
	}

	* handler(req, res) {
		//TODO: Add some basic stats (K/D etc.)
		res.json(yield this.find(req.params.steamid));
		//res.send("")
	}
}
