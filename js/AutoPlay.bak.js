function AutoPlay(kb)
{
	this.kb = kb;
	
	// List of available heuristics
	this.h_list = [
		"RowSumsInOrder",
		"MinimizeSquares",
		"MaxSquareInTopCorner",
		"AvgSquareReciprocal",
		"AvgPowerDist",
		"TopRowFilled",
		"CanCancelToTop",
		"SnakeDiff",
		"MinimizeSurfaceArea",
		"RowInOrder"
		];

	this.h_list.sort();
}

/*
 * 'grid' is an array of 4 columns, each with 4 entries
 */
AutoPlay.prototype.choose = function(grid) {
	function makeArray(cells)
	{
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

	var map = {
		"up":		0,
		"right":	1,
		"down":		2,
		"left":		3
	};

	var self = this;

	// We need the heuristic values to be in h[] as up, right, down, left...in that order
	var h = [9999999, 9999999, 9999999, 9999999];
	original = makeArray(grid.cells);
	// Up version
	copy = makeArray(grid.cells);
	this.moveUp(copy);
	if (!original.equals(copy)) {
		h[0] = this.heuristic(copy, 0);
	}

	// Right version
	copy = makeArray(grid.cells);
	this.moveRight(copy);
	if (!original.equals(copy)) {
		h[1] = this.heuristic(copy, 1);
	}

	// Down version
	copy = makeArray(grid.cells);
	this.moveDown(copy);
	if (!original.equals(copy)) {
		h[2] = this.heuristic(copy, 2);
	}

	// Left version
	copy = makeArray(grid.cells);
	this.moveLeft(copy);
	if (!original.equals(copy)) {
		h[3] = this.heuristic(copy, 3);
	}

	//console.info(h);

	h_best = 99999999;
	action = -1;
	for (i = 0; i < h.length; i++) {
		if (h[i] < h_best) {
			h_best = h[i];
			action = i;
		}
	}

	setTimeout(function(){
		h = h;
		self.kb.emit("move", action);
	}, 65);
}

AutoPlay.prototype.moveUp = function(cells) {
	this.exclude = [];
	for (row = 1; row < 4; row++) {
		for (col = 0; col < 4; col++) {
			if (cells[col][row] != 0) {
				this.moveCellVert(cells, col, row, -1);
			}
		}
	}
}

AutoPlay.prototype.moveDown = function(cells) {
	this.exclude = [];
	for (row = 2; row >= 0; row--) {
		for (col = 0; col < 4; col++) {
			if (cells[col][row] != 0) {
				this.moveCellVert(cells, col, row, 1);
			}
		}
	}
}

AutoPlay.prototype.moveLeft = function(cells) {
	this.exclude = [];
	for (col = 1; col < 4; col++) {
		for (row = 0; row < 4; row++) {
			if (cells[col][row] != 0) {
				this.moveCellHoriz(cells, col, row, -1);
			}
		}
	}
}

AutoPlay.prototype.moveRight = function(cells) {
	this.exclude = [];
	for (col = 2; col >= 0; col--) {
		for (row = 0; row < 4; row++) {
			if (cells[col][row] != 0) {
				this.moveCellHoriz(cells, col, row, 1);
			}
		}
	}
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
	} else if (cells[col + step][row] == cells[old][row]) {
		if (!this.excluded(col + step, row)) {
			// We stopped at a matching square
			cells[col + step][row] *= 2;
			cells[old][row] = 0;
			this.exclude.push([col+step, row]);
		} else {
			if (col != old) {
				// We stopped at a non-matching square
				cells[col][row] = cells[old][row];
				cells[old][row] = 0;
			}
		}
	} else {
		if (col != old) {
			// We stopped at a non-matching square
			cells[col][row] = cells[old][row];
			cells[old][row] = 0;
		}
	}
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
			&& cells[col][row+step] == 0 // Next spot is empty
		  ) {
		row += step;
	}

	if (row + step == bound && cells[col][bound] == 0) { // We went all the way to the wall
		cells[col][row + step] = cells[col][old];
		cells[col][old] = 0;
	} else if (cells[col][row + step] == cells[col][old]) {
		if (!this.excluded(col, row + step)) {
			// We stopped at a matching square
			cells[col][row + step] *= 2;
			cells[col][old] = 0;
			this.exclude.push([col, row+step]);
		} else {
			if (row != old) {
				// We stopped at a non-matching square
				cells[col][row] = cells[col][old];
				cells[col][old] = 0;
			}
		}
	} else {
		if (row != old) {
			// We stopped at a non-matching square
			cells[col][row] = cells[col][old];
			cells[col][old] = 0;
		}
	}
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

/*
 * Heuristics
 */
AutoPlay.prototype.heuristic = function(cells, action) {
	var funcs = [
			{coef: 20, fn: this.RowSumsInOrder},
			{coef: 10, fn: this.MinimizeSquares},
			{coef: 50, fn: this.MaxSquareInTopCorner},
			{coef: 12, fn: this.AvgSquareReciprocal},
			{coef: 10, fn: this.AvgPowerDist},
			{coef: 25, fn: this.TopRowFilled},
			//{coef: 4, fn: this.CanCancelToTop},
			//{coef: 10, fn: this.SnakeDiff},
			//{coef: 20, fn: this.LongestSnake},
			//{coef: 20, fn: this.MinimizeSurfaceArea},	// This just doesn't provide much variablity
			//{coef: 5, fn: this.RowInOrder}
			];

	var h = 0;
	var coef_total = 0;
	for (var i = 0; i < funcs.length; i++) {
		h += funcs[i].coef * funcs[i].fn.call(this, cells, true);
		coef_total += funcs[i].coef;
	}

	h /= coef_total;

	return h;
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
	this.snakeIter(cells, {
		ignore_empty: false,
		callback: handler
	});
	tl_snake_flip_count = snake_flip_count;
	snake_flip_count = 0;
	this.snakeIter(cells, {
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
 * Range/Values: 1, 5
 */
AutoPlay.prototype.TopRowFilled = function(cells, norm) {
	var filled = true;
	for (c = 0; c < 4; c++) {
		if (cells[c][0] == 0) {
			filled = false;
			break;
		}
	}

	ret = filled ? 1 : 5;
	if (norm) {
		ret = normalize(ret, 1, 5);
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
	return cnt;
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

	ret = max_in_corner ? 1 : 8;
	if (norm) {
		ret = normalize(ret, 1, 8);
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
				total += item * item * item;	// item^3 to increase importance of canceling high blocks first
			}
		});
	});

	ret = cnt/total;
	if (norm) {
		ret = normalize(ret, 0, 1/8);
	}
	return ret;
}

/*
 * //-----------Range/Values: 1, 2, 3, 4
 * Range/Values: [0, 10]
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
	}

	//ret = cnt + 1;
	if (norm) {
		ret = normalize(ret, 0, 10);
	}
	return ret;
}

/*
 * Range/Values: 1, 2, 3, 4
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
		if (row_sums[i] < row_sums[i+1]) {
			cnt++;
		}
	}

	ret = cnt + 1;
	if (norm) {
		ret = normalize(ret, 1, 4);
	}
	return ret;
}

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
				total_power_dist += this.powerDist(val, down);
			}

			// Check "right" neighbor if exists
			if (c + 1 < 4 && cells[c+1][r] != 0) {
				cnt++;
				right = cells[c+1][r];
				total_power_dist += this.powerDist(val, right);
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

AutoPlay.prototype.powerDist = function(a, b) {
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
}

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
AutoPlay.prototype.snakeIter = function(cells, opt) {
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
