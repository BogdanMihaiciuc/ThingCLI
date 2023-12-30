import * as readline from 'readline';

/**
 * An array containing progress characters corresponding to partially filled progress
 * bar sections. 
 */
const FractionalSymbols = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

/**
 * The character representing a complete portion of the bar.
 */
const CompleteBarSymbol = '█';

/**
 * The character representing an empty portion of the bar.
 */
const EmptyBarSymbol = ' ';

/**
 * The character representing the start of the bar.
 */
const StartSymbol = '[';

/**
 * The character representing the end of the bar.
 */
const EndSymbol = ']';

/**
 * A class that creates and manages an update cli progress bar.
 */
export class ProgressBar {

    /**
     * A value between 0 and 1 that controls the progress displayed.
     */
    private _progress: number = 0;

    /**
     * An optional message that is displayed below the progress bar.
     */
    private _message: string = '';

    /**
     * The number of characters that the progress bar should use.
     */
    private _length: number = 40;

    /**
     * The normalized progress is the progress expressed in how many
     * characters times how many fractional symbols per character are
     * displayed.
     */
    private _normalizedProgress: number = 0;

    /**
     * Draws the progress bar. Until invoking `stop`, you should not write to stdout.
     */
    start() {
        this._render();
    }

    /**
     * Clears the progress bar.
     */
    private _clear() {
        readline.clearLine(process.stdout, -1);
        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 1);
        process.stdout.write('\r');
    }

    /**
     * Renders this progress bar at the current cursor position.
     */
    private _render() {
        // Draw the beginning of the bar
        process.stdout.write(StartSymbol);

        // Calculate how many complete symbols to draw
        const completeSymbols = this._progress * this._length | 0;

        // Select the appropriate fractional symbol
        const fractionalSymbolIndex = (this._normalizedProgress | 0) % FractionalSymbols.length;

        // Count how many empty symbols to draw
        const remainingSymbols = this._length - completeSymbols - 1;

        // Draw the complete symbols
        process.stdout.write(Array(completeSymbols).fill(CompleteBarSymbol).join(''));

        if (completeSymbols < this._length) {
            // Draw the fractional symbol
            process.stdout.write(FractionalSymbols[fractionalSymbolIndex]);

            // Draw the remaining empty symbols
            process.stdout.write(Array(remainingSymbols).fill(EmptyBarSymbol).join(''));
        }

        // Close the bar and draw the message, then hide the cursor
        process.stdout.write(`${EndSymbol} | ${(this._progress * 100) | 0}%\n\x1b[2m${this._message}\x1b[0m`);
    }

    /**
     * Updates the bar with the given progress and message.
     * @param progress      The new progress value.
     * @param message       The new message.
     */
    update(progress: number, message: string) {
        this._progress = progress;
        this._normalizedProgress = progress * this._length * FractionalSymbols.length | 0;
        this._message = message;

        // Clear then re-render
        this._clear();
        this._render();
    }

    /**
     * Moves the cursor to the next line.
     */
    stop() {
    }

    /**
     * Clears the progress bar and moves the cursor back to where the progress
     * bar started.
     */
    destroy() {
        this._clear();

    }

}