# ScheduleswornCronspammer

If you have trouble context-switching to meetings or remembering them at all, try this for spamming yourself with regular meeting alerts. This is what works for me!

(Thanks to the Soft Skills Engineering podcast and Slack community for inspiring me to share this back.)

## Setup

install
- brew install terminal-notifier for default notifications
- npm install for the package.json requirements
- set up an alias (suggested: "mtg", per alias.sh) to ruin the command
- run `mtg init` to set up the config file
- OS X: crontab -e with something like alerter.cron
    - it will run every minute to check for events

## Usage Workflow (Suggested)

* Every day, run `mtg daily-setup` to add events.
  * Meeting text should be a string that you hope to be parseable to include date - try it out.
  * (This also prunes previous days' events.)
* To see the day's events, run `mtg today`
* To add a new event, run `mtg add <meeting description>`
* **Now-ish events**
    * To see "now-ish" events (that start between 15 minutes ago and 15 minutes from now), `mtg nowish`
    * If you've set up the crontab, you'll get spammed with events appropriately. You can try this one-off with `mtg nowish-notify`.
    * Type in `mtg ACK` to quiet those events
* You can edit `~/.mtgrc.json` for editing/removing/fixing entries.

# FAQ

1.  Why crontab?

    It's easy.

2.  Why manually enter events?

    a. Writing events helps commit them to memory and intention.
    b. It's much easier that working with gcal/outlook APIs.

3.  What's with the name?

    I was trying to come up with something that sounds like it came out of D&D
    4th Edition or Magic the Gathering or something. (Why? Because it's excessive
    name makes a nice contrast to what is a very humble script.) It's also a bit
    of a tongue-twister.

# TODOs

* TODO: expand this doc
* TODO: move the notifier impl to configs rather than hardcoding
* TODO: parameterize alert.crontab, alias.sh to not include my username
