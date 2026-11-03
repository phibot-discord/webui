const SLOW = 1.4;
const STEADY = 1.15;
const DOWN_AFTER = 40;
const UP_AFTER = 900;
const DRIFT = 0.02;

export class Pacer {
	private period = Number.POSITIVE_INFINITY;
	private slow = 0;
	private smooth = 0;

	step(delta: number): -1 | 0 | 1 {
		if (!(delta > 0) || delta > 250) return 0;
		this.period = Math.min(delta, this.period + DRIFT);
		const ratio = delta / this.period;
		if (ratio > SLOW) {
			this.slow++;
			this.smooth = 0;
		} else {
			this.slow = Math.max(0, this.slow - 1);
			if (ratio < STEADY) this.smooth++;
		}
		if (this.slow > DOWN_AFTER) {
			this.slow = 0;
			return -1;
		}
		if (this.smooth > UP_AFTER) {
			this.smooth = 0;
			return 1;
		}
		return 0;
	}
}
