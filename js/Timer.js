var Timer = function()
{
	// Property: Frequency of elapse event of the timer in millisecond
	this.Interval = 1000;

	// Property: Whether the timer is enable or not
	this.Enable = new Boolean(false);

	// Property: keep a current count of the timer iterations
	this.currentCount = 0;

	// Event: Timer tick
	this.Tick;

	// Member variable: Hold interval id of the timer
	var timerId = 0;

	// Member variable: Hold instance of this class
	var thisObject;

	// Function: Start the timer
	this.Start = function() {
		this.Enable = new Boolean(true);
		thisObject = this;
		if (thisObject.Enable) {
			thisObject.timerId = setInterval(function() {
				thisObject.Tick();
				thisObject.currentCount++;
			}, thisObject.Interval);
		}
	};

	// Function: Stops the timer
	this.Stop = function() {
		thisObject = this;
		thisObject.Enable = new Boolean(false);
		clearInterval(thisObject.timerId);
		thisObject.currentCount = 0;
	};

	// Function: reset the timer
	this.Reset = function()
	{
		thisObject = this;
		thisObject.Enable = new Boolean(false);
		this.Stop();
		this.Start();
	};
};
