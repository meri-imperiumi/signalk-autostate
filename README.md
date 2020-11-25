Signal K auto-state plugin
==========================

This plugin attempts to determine the vessel's state based on sensor values, and updates the `navigation.state` value accordingly.

Currently inputs used are:

* `navigation.anchor.position`: if an anchor is set, the vessed is set as "anchored"
* `navigation.position`: if the vessel moves less than 100 meters in 10m minutes, it is set as "moored", otherwise it is set as "sailing"
* `propulsion.*.revolutions` is used to determine whether the vessel is "sailing" or "motoring" when considered to be moving

The default means of propulsion ("sailing" or "motoring") when moving can be chosen in the plugin settings.

The vessel navigation state can be useful for AIS data, as well as for customizing boat dashboard for the current situation.

## Changes

* 0.1.4 (2020-11-25)
  - Compatibility with the upcoming "meta deltas" feature in Signal K
* 0.1.3 (2020-10-13)
  - Simplified dependency chain by only using the `where` library for location calculations at runtime
* 0.1.2 (2020-04-17)
  - Switched status from `not-under-way` to `moored`
  - Switched status from `under-engine` to `motoring`
  - Added propulsion support
* 0.1.1 (2020-01-31)
  - Fixed integration with Signal K
* 0.1.0 (2020-01-31)
  - Initial release. Should work with anchor and position for a sailboat
  - No propulsion support implemented yet
