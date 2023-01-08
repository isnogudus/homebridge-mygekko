# homebridge-mygekko
Homebridge Platform for MyGEKKO

This is a homebridge platform for my MyGEKKO system. I try to integrate all my MyGEKKO parts so it can be controlled via Apple Home. Till now blinds, thermostats and humidity are working.

One problem is to handle control over the MyGEKKO terminal. There are update issues in the home app. so sometimes an incorrect status is displayed.

I try to work arround some inaccuracy reported from my blinds, exspecially in the fully open and fully closed state.

As usual add the plattform to the homebridge config.json:
```json
{
  "platforms": [
    {
        "platform": "mygekko",
        "user": "<username>",
        "password": "<password>",
        "host": "<host>",
        "blindAdjustment": {},
        "blinds": {
            "item0": {
                "name": "Wohnbereich"
            },
            "item1": {
                "name": "Büro"
            },
            "item4": {
                "name": "Schlafzimmer"
            }
        },
        "thermostats": {
            "item0": {
                "name": "Wohnbereich"
            },
            "item1": {
                "name": "Büro"
            },
            "item4": {
                "name": "Schlafzimmer"
            }
        }
    }
  ]
}
```
Display names can be overwritten in the configuration.