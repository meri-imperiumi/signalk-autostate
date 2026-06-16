Signal K auto-state plugin
==========================

This plugin attempts to determine the vessel's state based on sensor values, and updates the `navigation.state` value accordingly.

Currently inputs used are:

* `navigation.anchor.position`: if an anchor is set, the vessed is set as "anchored"
* `navigation.position`: if the vessel moves less than 100 meters in 10 minutes, it is set as "moored", otherwise it is set as "sailing"
* `propulsion.*.revolutions` is used to determine whether the vessel is "sailing" or "motoring" when considered to be moving
* `propulsion.*.state` (value `started` or `stopped`) is used to determine whether the vessel is "sailing" or "motoring" when considered to be moving

The default means of propulsion ("sailing" or "motoring") when moving can be chosen in the plugin settings.

The vessel navigation state can be useful for AIS data, as well as for customizing boat dashboard for the current situation.

## Changes

See <CHANGELOG.md>
