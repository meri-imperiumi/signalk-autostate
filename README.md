Signal K auto-state plugin
==========================

This plugin attempts to determine the vessel's state based on sensor values, and updates the `navigation.state` value accordingly.

Currently inputs used are:

* `navigation.anchor.position`: if an anchor is set, the vessed is set as "anchored"
* `navigation.position`: if the vessel moves less than 100 meters in 10m minutes, it is set as "not-under-way", otherwise it is set as "sailing"
* We're also planning to use propulsion RPMs to determine whether the vessel is "sailing" or "under-engine"

The vessel navigation state can be useful for AIS data, as well as for customizing boat dashboard for the current situation.

## Changes

* 0.1.0 (2020-01-31)
  - Initial release. Should work with anchor and position for a sailboat
  - No propulsion support implemented yet
