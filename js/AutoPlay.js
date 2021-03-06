function printFuncs(x, state)
{
	for (var i = 0; i < x.length; i++) {
		var val = x[i].fn(state, true);
		console.info(i + ": " + x[i].coef + ", " + val);
	}
}


max_square = 0;

function AutoPlay(kb)
{
	this.kb = kb;

	this.game_count = 1;

	max_square = 0;
	this.max = [];

	this.step = 0;
	this.game_step = 0;

	// Learning parameters
	this.alpha = 0.1;
	this.gamma = 0.7;
	this.reward = 1;
	this.penalty = -10;

	this.curr_value = 0;
	this.best_future_val = 0;

	var elem = document.getElementById("auto_action");
	this.auto_action = elem.checked;

	// List of available heuristics
	this.h_list = [
		"MaxSquareInTopCorner",
		"TopRowFilled",
		"SquaredValue",
		/*
		"AvgPowerDist",
		"NumValidMoves",
		"MinAvgManhattanDistToMatches",
		"RowMinMaxInOrder",
		"RowSumsInOrder",
		"AvgSquareReciprocal",
		"MinimizeSquares",
		"SnakeDiff",
		"RowInOrder",
		"CanCancelToTop",
		"MinimizeSurfaceArea",
		"AtLeastOneRowSemiFull"
		*/
		];

	this.getOptions();
}

AutoPlay.prototype.updateWeights = function(r, best_future_val, curr_expected, state) {
	//console.info("Update weights: r(" + r + "), best_future_val(" + best_future_val + "), expected(" + curr_expected + ")");
	for (var i = 0; i < this.funcs.length; i++) {
		var f_val = this.funcs[i].fn(state, true);
		var old_coef = this.funcs[i].coef;
		this.funcs[i].coef += this.alpha * (r + this.gamma * best_future_val - curr_expected) * f_val;

		this.funcs[i].coef = Math.max(this.funcs[i].coef, 0);
		//console.info(i + ": " + this.funcs[i].coef + " <- " + old_coef);
		/*
		if (this.funcs[i].coef < 0) {
			this.auto_action = false;
		}
		*/


		/*
		console.info(i + ": " + this.funcs[i].coef + ", " + f_val);
		if (this.funcs[i].coef < 0) {
			console.info("COEF went negative!");
			console.info("actual = " + actual + "\nexpected = " + expected);
			return false;
		}
		*/
	}

	return true;
};

AutoPlay.prototype.gameOver = function(GameManager) {
	console.info("Restarting after game: " + this.game_count);
	if (!this.updateWeights(this.penalty, this.best_future_val, this.curr_value, this.original)) {
		return;
	}
	if (this.alpha > 0.02 && !(this.game_count % 2)) {
		this.alpha -= 0.01;
	}
	this.max.push(max_square);
	max_square = 0;

	console.info("MAX");
	console.info(this.max);

	var self = this;
	setTimeout(function() {
		GameManager.restart();
		self.game_count++;
		self.game_step = 0;
		GameManager.move(0);
	}, 100);
};

/*
 * 'grid' is an array of 4 columns, each with 4 entries
 */
AutoPlay.prototype.choose = function(grid, points) {
	function makeArray(cells)
	{
		points = points || 0;

		var ret = [];
		var c = 0;
		var r = 0;
		cells.forEach(function(col) {
			ret[c] = [];
			r = 0;
			col.forEach(function(item) {
				if (item) {
					ret[c][r] = item.value;
				} else {
					ret[c][r] = 0;
				}
				r++;
			});
			c++;
		});

		return ret;
	}

	this.reward = Math.max(Math.log(points), 1);

	console.info("R = " + this.reward + " alpha = " + this.alpha);
	this.step++;
	this.game_step++;

	var elem = document.getElementById("auto_action");
	this.auto_action = elem.checked;

	var map = {
		"up":		0,
		"right":	1,
		"down":		2,
		"left":		3
	};

	var self = this;

	this.original = makeArray(grid.cells);

	// Get value of the state we're in
	this.curr_value = this.getStateValue(this.original);
	console.info("Curr_value: " + this.curr_value);
	printFuncs(this.funcs, this.original);

	if (!this.updateWeights(this.reward, this.best_future_val, this.curr_value, this.original)) {
		return;
	}



	var h = this.getFutureStateValues(this.original);

	h_best = Number.NEGATIVE_INFINITY;
	best_actions = [];
	for (i = 0; i < h.length; i++) {
		if (h[i] > h_best) {
			h_best = h[i];
			best_actions = [i];
		} else if (h[i] == h_best) {
			best_actions.push(i);
		}
	}

	var x = Math.floor(Math.random() * best_actions.length);
	action = best_actions[x];
	this.best_future_val = h_best;

	//console.info("future state values:"); console.info(h);

	if (action == -1 || this.best_future_val < 0) {
		console.info(h);
		this.best_future_val = 0;

		console.info("Action not chosen, game over?");
		//this.auto_action = false;
	}


	if (this.auto_action) {
		this.doAction(this.original, action);
		setTimeout(function(){
			h = h;
			self.kb.emit("move", action);
		}, 65);
	}
}

AutoPlay.prototype.moveUp = function(cells) {
	this.exclude = [];
	var moved = false;
	for (var row = 1; row < 4; row++) {
		for (var col = 0; col < 4; col++) {
			if (cells[col][row] != 0) {
				var tmp = this.moveCellVert(cells, col, row, -1);
				moved = moved || tmp;
			}
		}
	}

	return moved;
}

AutoPlay.prototype.moveDown = function(cells) {
	this.exclude = [];
	var moved = false;
	for (var row = 2; row >= 0; row--) {
		for (var col = 0; col < 4; col++) {
			if (cells[col][row] != 0) {
				var tmp = this.moveCellVert(cells, col, row, 1);
				moved = moved || tmp;
			}
		}
	}

	return moved;
}

AutoPlay.prototype.moveLeft = function(cells) {
	this.exclude = [];
	var moved = false;
	for (var col = 1; col < 4; col++) {
		for (var row = 0; row < 4; row++) {
			if (cells[col][row] != 0) {
				var tmp = this.moveCellHoriz(cells, col, row, -1);
				moved = moved || tmp;
			}
		}
	}

	return moved;
}

AutoPlay.prototype.moveRight = function(cells) {
	this.exclude = [];
	var moved = false;
	for (var col = 2; col >= 0; col--) {
		for (var row = 0; row < 4; row++) {
			if (cells[col][row] != 0) {
				var tmp = this.moveCellHoriz(cells, col, row, 1);
				moved = moved || tmp;
			}
		}
	}

	return moved;
}

AutoPlay.prototype.moveCellHoriz = function(cells, col, row, step) {
	var bound = 0;
	if (step > 0) {
		bound = 3;
	}
	if (col == bound) {
		// We're at the wall already
		return;
	}

	var old = col;

	while (
			(col + step) != bound // Still room to move in bounds
			&& cells[col+step][row] == 0 // Next spot is empty
		  ) {
		col += step;
	}

	if (col + step == bound && cells[bound][row] == 0) { // We went all the way to the wall
		cells[col + step ][row] = cells[old][row];
		cells[old][row] = 0;

		return true;
	} else if (cells[col + step][row] == cells[old][row]) {
		if (!this.excluded(col + step, row)) {
			// We stopped at a matching square
			cells[col + step][row] *= 2;
			cells[old][row] = 0;
			this.exclude.push([col+step, row]);

			return true;
		} else {
			if (col != old) {
				// We stopped at a non-matching square
				cells[col][row] = cells[old][row];
				cells[old][row] = 0;

				return true;
			}
		}
	} else {
		if (col != old) {
			// We stopped at a non-matching square
			cells[col][row] = cells[old][row];
			cells[old][row] = 0;

			return true;
		}
	}

	return false;
}

AutoPlay.prototype.moveCellVert = function(cells, col, row, step) {
	var bound = 0;
	if (step > 0) {
		bound = 3;
	}
	if (row == bound) {
		// We're at the wall already
		return;
	}

	var old = row;

	while (
			(row + step) != bound // Still room to move in bounds
			&& cells[col][row + step] == 0 // Next spot is empty
		  ) {
		row += step;
	}

	if (row + step == bound && cells[col][bound] == 0) { // We went all the way to the wall
		cells[col][row + step] = cells[col][old];
		cells[col][old] = 0;
		
		return true;
	} else if (cells[col][row + step] == cells[col][old]) {
		if (!this.excluded(col, row + step)) {
			// We stopped at a matching square
			cells[col][row + step] *= 2;
			cells[col][old] = 0;
			this.exclude.push([col, row+step]);

			return true;
		} else {
			if (row != old) {
				// We stopped at a non-matching square
				cells[col][row] = cells[col][old];
				cells[col][old] = 0;

				return true;
			}
		}
	} else {
		if (row != old) {
			// We stopped at a non-matching square
			cells[col][row] = cells[col][old];
			cells[col][old] = 0;

			return true;
		}
	}

	return false;
}

AutoPlay.prototype.excluded = function(col, row) {
	for (i = 0; i < this.exclude.length; i++) {
		if (this.exclude[i][0] == col &&
			this.exclude[i][1] == row) {
			return true;
		}
	}

	return false;
}

AutoPlay.prototype.getOptions = function() {

	this.funcs = [];
	for (var i = 0; i < this.h_list.length; i++) {
		this.funcs.push({coef: 1, fn: this[this.h_list[i]]});
	}
	console.info("Options loaded");
}

AutoPlay.prototype.getEmptyCells = function(cells) {
	var ret = [];
	for (var r = 0; r < 4; r++) {
		for (var c = 0; c < 4; c++) {
			if (cells[c][r] == 0) {
				ret.push({c: c, r: r});
			}
		}
	}

	return ret;
}

AutoPlay.prototype.Q = function(cells, action) {
	var copy = copyArray(cells);
	if (this.doAction(copy, action)) {
		return this.getStateValue(copy);
	} else {
		return -9999999999;
	}
};

AutoPlay.prototype.doAction = function(cells, action) {
	var moved = false;
	switch (action) {
		case 0:
			moved = this.moveUp(cells);
			break;

		case 1:
			moved = this.moveRight(cells);
			break;

		case 2:
			moved = this.moveDown(cells);
			break;

		case 3:
			moved = this.moveLeft(cells);
			break;
	}

	return moved;
};

var global_hack = null;

AutoPlay.prototype.getStateValue = function(cells) {
	var val = 0;
	global_hack = this;
	for (var i = 0; i < this.funcs.length; i++) {
		val += this.funcs[i].coef * this.funcs[i].fn(cells, true);
	}

	return val;
}

AutoPlay.prototype.getFutureStateValues = function(cells) {
	// We need the state values to be in v[] as up, right, down, left...in that order
	var v = [0, 0, 0, 0];

	for (var i = 0; i < 4; i++) {
		// Get the value whether or not the action does anything
		v[i] = this.Q(cells, i);
	}

	return v;
}

/*
 * Only enforces for non-top rows
 *
 * Range: [0, 1]
 */
AutoPlay.prototype.AtLeastOneRowSemiFull = function(cells, norm) {
	var ret = 0;
	for (var r = 1; r < 4; r++) {
		var row_fill = 0;
		for (var c = 0; c < 4; c++) {
			if (cells[c][r] != 0) {
				row_fill++;
			}
		}
		if (row_fill > 0 && row_fill < 4) {
			return 0;
		}
	}

	return 1;
}

/*
 * Minimum of upper row should be less than or equal to the max of the
 * row below it.
 *
 * Range: [0, 3]
 */
AutoPlay.prototype.RowMinMaxInOrder = function(cells, norm) {
	function removeVal(arr, val)
	{
		var i = arr.indexOf(val);
		while (i != -1) {
			arr.splice(i, 1);
			i = arr.indexOf(val);
		}
	}

	var cnt = 0;

	var r0 = [cells[0][0], cells[1][0], cells[2][0], cells[3][0]];
	var r1 = [cells[0][1], cells[1][1], cells[2][1], cells[3][1]];
	var r2 = [cells[0][2], cells[1][2], cells[2][2], cells[3][2]];
	var r3 = [cells[0][3], cells[1][3], cells[2][3], cells[3][3]];

	removeVal(r0, 0);
	removeVal(r1, 0);
	removeVal(r2, 0);
	removeVal(r3, 0);

	var r0_min = Math.min.apply(Math, r0);

	var r1_max = Math.max.apply(Math, r1);
	var r1_min = Math.min.apply(Math, r1);

	var r2_max = Math.max.apply(Math, r2);
	var r2_min = Math.min.apply(Math, r2);

	var r3_max = Math.max.apply(Math, r3);

	if (r0_min > r1_max) cnt++;
	if (r1_min > r2_max) cnt++;
	if (r2_min > r3_max) cnt++;

	var ret = cnt;
	if (norm) {
		ret = normalize(ret, 0, 3);
	}

	return ret;
}

/*
 * Range: [0, 6]
 */
AutoPlay.prototype.MinAvgManhattanDistToMatches = function(cells, norm) {
	var pos = {};
	var cnt = 0;
	var total = 0;

	var values_found = [];
	for (var r = 0; r < 4; r++) {
		for (var c = 0; c < 4; c++) {
			if (cells[c][r] != 0 && values_found.indexOf(cells[c][r]) == -1) {
				values_found.push(cells[c][r]);
				pos = findValFromCell(cells, cells[c][r], c+1, r);
				while (pos) {
					cnt++;
					total += (Math.abs(c - pos.c) + Math.abs(r - pos.r));
					pos = findValFromCell(cells, cells[c][r], pos.c+1, pos.r);
				}
			}
		}
	}

	var ret = cnt == 0 ? 0 : total/cnt;

	if (norm) {
		ret = normalize(ret, 0, 6);
	}

	return ret;
}

/*
 * Range: [0, 14]
 */
AutoPlay.prototype.LongestSnake = function(cells, norm) {

}

/*
 * Range: [0, 14]
 *
 * Start at a top corner and snake down, checking only the sign of the difference of two numbers
 * Take the minimum of the top left snake and the top right snake.
 */
AutoPlay.prototype.SnakeDiff = function(cells, norm) {

	/*
	 * opt: {
	 *			c: #,  -> starting column; 0 or 3
	 *			r: #,  -> starting row; 0 or 3
	 *			vert: bool,	-> indicates starting direction is up/down or left/right
	 *			callback: fn,	-> function that gets passed the value
	 *			ignore_empty: bool -> indicates whether or not to ignore empty cells
	 * }
	 *
	 * or opt can be a callback and the default is c = r = 0, vert = false, and ignore_empty = true
	 */
	function snakeIter(cells, opt) {
		var defaults = {
			c: 0,
			r: 0,
			vert: false,
			ignore_empty: true
		};
		if (typeof opt == "function") {
			opt = {callback: opt};
		}

		opt = merge(defaults, opt);

		var r_dir = (opt.r == 0 ? 1 : -1);
		var c_dir = (opt.c == 0 ? 1 : -1);

		if (opt.vert) {
			// Column is outer
			var r = opt.r;
			for (var c = opt.c, cnt = 0; cnt < 4; c += c_dir, cnt++) {
				for (var cnt2 = 0; cnt2 < 4; r += r_dir, cnt2++) {
					if (cells[c][r] != 0 || !opt.ignore_empty) {
						opt.callback(cells[c][r], c, r);
					}
				}
				r -= r_dir;
				r_dir *= -1;
			}
		} else {
			// Row is outer
			var c = opt.c;
			for (var r = opt.r, cnt = 0; cnt < 4; r += r_dir, cnt++) {
				for (var cnt2 = 0; cnt2 < 4; c += c_dir, cnt2++) {
					if (cells[c][r] != 0 || !opt.ignore_empty) {
						opt.callback(cells[c][r], c, r);
					}
				}
				c -= c_dir;
				c_dir *= -1;
			}
		}
	}

	function handler(val, c, r)
	{
		if (val == 0) return;
		if (last_val != -1) {	// We have set a value.
			if (dir == 0 && val != last_val) {	// We haven't set a direction yet.
				dir = (val - last_val > 0 ? 1 : -1);
			} else {
				if (val != last_val) {	// No need to check for flip on equal
					var tmp_dir = (val - last_val > 0 ? 1 : -1);
					if (tmp_dir != dir) {
						snake_flip_count++;
					}
					dir = tmp_dir;
				}
			}
		}
		last_val = val;
	}

	var tl_snake_flip_count = 0;
	var tr_snake_flip_count = 0;
	var snake_flip_count = 0;

	var dir = 0;
	var last_val = -1;
	// Top/Left
	snakeIter(cells, {
		ignore_empty: false,
		callback: handler
	});
	tl_snake_flip_count = snake_flip_count;
	snake_flip_count = 0;
	snakeIter(cells, {
		c: 3,
		ignore_empty: false,
		callback: handler
	});
	tr_snake_flip_count = snake_flip_count;

	ret = Math.min(tl_snake_flip_count, tr_snake_flip_count);
	if (norm) {
		ret = normalize(ret, 0, 14);
	}

	console.info(ret);
	return ret;
}

/*
 * Range: [0, 24]
 */
AutoPlay.prototype.MinimizeSurfaceArea = function(cells, norm) {
	var sa = 0;
	for (var r = 0; r < 4; r++) {
		for (var c = 0; c < 4; c++) {
			if (cells[c][r] != 0) {
				// Check up if not wall
				if (r != 0) sa += (cells[c][r - 1] == 0 ? 1 : 0);
				// Check right if not wall
				if (c != 3) sa += (cells[c + 1][r] == 0 ? 1 : 0);
				// Check down if not wall
				if (r != 3) sa += (cells[c][r + 1] == 0 ? 1 : 0);
				// Check left if not wall
				if (c != 0) sa += (cells[c - 1][r] == 0 ? 1 : 0);
			}
		}
	}

	ret = sa;
	if (norm) {
		ret = normalize(ret, 0, 24);	// Assuming the (impossible) checkered board
	}

	console.info(ret);
	return ret;
}

/*
 * Range/Values: [0, 4]
 */
AutoPlay.prototype.TopRowFilled = function(cells, norm) {
	var filled = 0;
	for (c = 0; c < 4; c++) {
		if (cells[c][0] != 0) {
			filled++;
		}
	}

	ret = filled;	// More filled is better
	if (norm) {
		ret = normalize(ret, 0, 4);
	}
	return ret;
}

/*
 * This is the first of the "look ahead" heuristics.
 *
 * Range:
 */
AutoPlay.prototype.CanCancelToTop = function(cells, norm) {
	return (
			(	// Top can cancel within itself
			cells[0][0] == cells[1][0] ||
			cells[1][0] == cells[2][0] ||
			cells[2][0] == cells[3][0]
			) ||
			(	// TOp can cancel with 2nd row
			cells[0][0] == cells[0][1] ||
			cells[1][0] == cells[1][1] ||
			cells[2][0] == cells[2][1] ||
			cells[3][0] == cells[3][1]
			)
			? 1 : 5);
}

/*
 * Range/Values: [1, 16]
 */
AutoPlay.prototype.MinimizeSquares = function(cells, norm) {
	var cnt = 0;
	cells.forEach(function(col) {
		col.forEach(function(item) {
			if (item) {
				cnt++;
			}
		});
	});

	ret = cnt;
	if (norm) {
		ret = normalize(ret, 1, 16);
	}
	return ret;
}

/*
 * Range/Values: 1, 8
 */
AutoPlay.prototype.MaxSquareInTopCorner = function(cells, norm) {
	var max = 0;
	var max_in_corner = false;
	var c = 0;
	var r = 0;
	cells.forEach(function(col) {
		r = 0;
		col.forEach(function(item) {
			if (max < item) {
				max = item;
				max_in_corner = (c == 0 && r == 0) ||
								//(c == 0 && r == 3) ||
								//(c == 3 && r == 3) ||
								(c == 3 && r == 0);

			}
			r++;
		});
		c++;
	});

	if (max_square < max) {
		max_square = max;
		console.info("SETTING MAX ---------------------------------");
	}

	ret = max_in_corner ? 1 : 0;
	if (norm) {
		ret = normalize(ret, 0, 1);
	}
	return ret;
}

/*
 * Range/Values: (0, 1/8]		-> 1/8 is when there are 16 2's
 */
AutoPlay.prototype.AvgSquareReciprocal = function(cells, norm) {
	var cnt = 0;
	var total = 0;
	cells.forEach(function(col) {
		col.forEach(function(item) {
			if (item) {
				cnt++;
				total += item * item;	// item^2 to increase importance of canceling high blocks first
			}
		});
	});

	ret = cnt/total;
	if (norm) {
		ret = normalize(ret, 0, 1/8);
		ret = 1 - ret;
	}
	return ret;
}

AutoPlay.prototype.SquaredValue = function(cells, norm) {
	var total = 0;
	cells.forEach(function(col) {
		col.forEach(function(item) {
			if (item) {
				total += item * item;
			}
		});
	});

	ret = 1 - 8 / total;
	/*
	if (norm) {
		ret = normalize(ret, 0, 1);
	}
	*/
	return ret;
}

/*
 * Range: [0, 10]
 */
AutoPlay.prototype.RowInOrder = function(cells, norm) {
	var r = 0;
	var c = 0;
	var cnt = 0;
	for (r = 0; r < 4; r++) {
		var dir = 0;	//unknown direction
		for (c = 1; c < 4; c++) {
			if (cells[c-1][r] < cells[c][r]) {
				if (dir == 0) {
					dir = 1;
				} else if (dir == -1) {
					cnt += (4-r);	// row isn't in order; rows of different priority
					break;
				}
			} else if (cells[c-1][r] > cells[c][r]) {
				if (dir == 0) {
					dir = -1;
				} else if (dir == 1) {
					cnt += (4-r);	// row isn't in order; rows of different priority
					break;
				}
			}
		}
		if (dir == 0) {
			cnt += (4-r);	// Either the row is empty or all the same number
		}
	}

	ret = cnt;
	if (norm) {
		ret = normalize(ret, 0, 10);
	}
	return ret;
}

/*
 * Range/Values: 1, 2, 3
 */
AutoPlay.prototype.RowSumsInOrder = function(cells, norm) {
	var r = 0;
	var c = 0;
	var row_sums = [0, 0, 0, 0];
	for (r = 0; r < 4; r++) {
		for (c = 0; c < 4; c++) {
			row_sums[r] += cells[c][r];
		}
	}

	var cnt = 0;
	for (i = 0; i < 3; i++) {
		if (row_sums[i] >= row_sums[i+1]) {
			cnt++;
		}
	}

	ret = cnt + 1;
	if (norm) {
		ret = normalize(ret, 0, 4);
	}
	return ret;
}

AutoPlay.prototype.NumValidMoves = function(cells, norm) {
	var num = 0;
	for (var i = 0; i < 4; i++) {
		var copy = copyArray(cells);
		if (global_hack.doAction(copy, i)) {
			num++;
		}
	}

	ret = num;
	if (norm) {
		ret = normalize(ret, 0, 4);
	}
	return ret;
};

/*
 * Range/Values: [0, ~288]  This assumes the highest value square we can get is 8192 and
 * that the board is checkered with 8192 and 2 in the least convenient way.
 */
AutoPlay.prototype.AvgPowerDist = function(cells, norm) {

	var r = 0;
	var c = 0;
	var total_power_dist = 0;
	var cnt = 0;
	for (c = 0; c < 4; c++) {
		for (r = 0; r < 4; r++) {
			val = cells[c][r];
			if (val == 0) continue;
			// Check "down" neighbor if exists
			if (r + 1 < 4 && cells[c][r+1] != 0) {
				cnt++;
				down = cells[c][r+1];
				total_power_dist += powerDist(val, down);
			}

			// Check "right" neighbor if exists
			if (c + 1 < 4 && cells[c+1][r] != 0) {
				cnt++;
				right = cells[c+1][r];
				total_power_dist += powerDist(val, right);
			}
		}
	}

	ret = cnt == 0 ? 1 : total_power_dist / cnt;
	if (norm) {
		ret = normalize(ret, 0, 288);
	}
	return ret;
}

/*
 * Utilities
 */

function powerDist(a, b)
{
	var dist = 0;
	if (a < b) {
		tmp = a;
		a = b;
		b = tmp;
		//dist++;	// Being "out of order" costs us
	}

	while (a > b) {
		dist++;
		b *= 2;
	}

	return dist;
};


Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}

function normalize(val, min, max) {
	return (val - min) / (max - min);
}

/*
 * Merge objects.  Shallow copy.  Latest object wins.
 */
function merge()
{
    var obj = {},
        i = 0,
        il = arguments.length,
        key;
    for (; i < il; i++) {
        for (key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                obj[key] = arguments[i][key];
            }
        }
    }
    return obj;
}

/*
 * Starting at (col, row), this function proceeds through the columns in a row and on to the next
 * row until a cell with value 'val' is found and returns an object with form: {c: <col>, r: <row>}
 */
function findValFromCell(cells, val, col, row)
{
	for (var r = row; r < 4; r++) {
		for (var c = (r == row ? col : 0); c < 4; c++) {
			if (cells[c][r] == val) {
				return {c: c, r: r};
			}
		}
	}

	return null;
}

function init_cells(fn)
{
	if (!fn) {
		fn = function(c, r) {
			return (c+1) * (r+1);
		};
	}

	var cells = [];
	for (var c = 0; c < 4; c++) {
		cells[c] = [];
		for (var r = 0; r < 4; r++) {
			cells[c][r] = fn(c, r);
		}
	}

	return cells;
}

function copyArray(cells)
{
	var ret = [];
	cells.forEach(function(col) {
		var col_array = [];
		col.forEach(function(item) {
			col_array.push(item);
		});

		ret.push(col_array);
	});

	return ret;
}

