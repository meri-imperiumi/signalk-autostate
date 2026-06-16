* 0.6.1 (2026-06-16)
  - Added application icon and other Signal K app store improvements
* 0.6.0 (2026-06-12)
  - Added support for multiple engines on the vessel
* 0.5.1 (2025-04-07)
  - Fixed the "fake moored" after hoisting anchor
* 0.5.0 (2025-02-23)
  - Added a five minute extra grace period after deactivating anchor alarm before boat is considered moored
* 0.4.0 (2024-02-16)
  - Speed threshold where stopping the engine will set state to "moored" immediately is now configurable
* 0.3.1 (2023-07-27)
  - Fixed issue with persisted state "sticking"
* 0.3.0 (2023-07-23)
  - Latest state is now persisted on disk to retain state between reboots (like when restarting Signal K while under way)
* 0.2.0 (2023-02-16)
  - Switched "under way" heuristic to use a moving 10min window. This should eliminate some "false moored" situations
  - Made the switch between `sailing` and `motoring` when engine is started/stopped instant when under way
  - Added a special case for when motoring, motor is stopped and speed is zero. This goes directly to `moored`
* 0.1.5 (2020-11-30)
  - Compatibility with the new `setPluginStatus`/`setPluginError` APIs in Signal K
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

