---
title: "2.4 - Idiosyncrasies"
---

## Working with YOUR Browswer
I am deliberately building SJB Writer to function with your browser. There are a few reasons for this. For starters, it keeps the editing environment close to what you use on a regular basis. Perhaps more importantly, it keeps the app small, as you will already have a browser on your device in which it will run. 

Changing this gets into more detailed app building (quickly!) than I know I'll get to, so I want to point out some possible (probable in my own case!) things that you'll want to make a mental note of.

**1 - Launching**

Launching SJB Writer will be fairly straightforward. But while I'm trying to make it launch in its own window, Safari (at least) will open it in a new tab in your browser. If there's already an open window, it will add to it. So the mental note here is to open a new window (not just a new tab) for SJB Writer to open into. This will give you a better separation of the app versus other activities you have going on. This feature is only rectified (to my current understanding) by installing a full separate browser with the app, adding excessive and unnecessary bloat. This is not planned.

**2 - Quitting**

Similar to the above, there are some weird things that may happen when you close SJB Writer. On a Mac, you expect that when you close the app from the Dock that it will kill all windows related to that app. This will not work here. The still open tab in your browser will no non-functional now, though, as quitting the app did kill your server and processes for the app. Closing the tab in your browser, though, will quit the app after a short 3 second delay. That delay is because refreshing the app looks that same as closing the tab. This feature is only rectified (to my current understanding) by installing a full separate browser with the app, adding excessive and unnecessary bloat. This is not planned.