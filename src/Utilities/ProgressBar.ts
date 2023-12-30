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
     * A buffer containing the messages that should be displayed below the
     * progress bar.
     */
    private loggingBuffer: string[] = [];

    /**
     * A callback that is invoked on SIGINT and SIGTERM while the progress bar is running.
     * Reenables the cursor and exists the process.
     */
    private _sigintHandler = () => {
        process.stdout.write('\u001B[?25h');
        process.exit(1);
    };

    /**
     * Draws the progress bar. Until invoking `stop`, you should not write to stdout.
     */
    start() {
        this._render();

        // Reenable the cursor if the process stops
        process.once('SIGINT', this._sigintHandler);
        process.once('SIGTERM', this._sigintHandler);
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
        // content within logging buffer ?
        if (this.loggingBuffer.length > 0) {
            readline.clearLine(process.stdout, 0);

            // flush logging buffer and write content to terminal
            while (this.loggingBuffer.length > 0) {
                const message = this.loggingBuffer.shift();
                if (message) {
                    process.stdout.write(message + '\n');
                }
            }
        }
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
        process.stdout.write(`${EndSymbol} | ${(this._progress * 100) | 0}%\n\x1b[2m${this._message}\x1b[0m\u001B[?25l`);
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
     * Stops the progress bar, moves the cursor to the next line and shows it.
     */
    stop() {
        process.stdout.write('\n\u001B[?25h');

        process.off('SIGINT', this.destroy);
        process.off('SIGTERM', this.destroy);
    }

    /**
     * Clears the progress bar and moves the cursor back to where the progress
     * bar started.
     */
    destroy = () => {
        this.stop();
        this._clear();
    }

    /**
     * Logs a message to the console, that appears above the progress bar.
     * @param message String to log 
     */
    log(message: string) {
        // push content into logging buffer
        this.loggingBuffer.push(message);
    }

}