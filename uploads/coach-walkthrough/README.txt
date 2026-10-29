Coach walkthrough — Claude Design artboard

Coach-Walkthrough.dc.html      the artboard (1063 x 608), markup + styles + timeline script
coach-walkthrough-assets/      fonts, clouds, grain, wordmark and icons it links to

Keep the two side by side: the artboard links to the assets by relative path
(coach-walkthrough-assets/...). It loads ./support.js the same way your other
.dc.html files do, so it expects the project's own support.js next to it.

Tweaks on the artboard: autoplay, still (which chapter to hold on when autoplay
is off), showDetails (title + description under the phone).
