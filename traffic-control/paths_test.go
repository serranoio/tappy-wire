package trafficControl

import (
	"testing"

	"github.com/pb33f/libopenapi"
	"github.com/pb33f/wiretap/shared"
)

var doc = `
openapi: 3.0.0
info:
  title: Wild West API
  version: 1.0.0
  description: Howdy partner! This here's the Wild West API, where we manage our saloon operations and keep track of our cowboys.
  contact:
    name: Sheriff API
    email: sheriff@wildwest.com
    url: https://wildwest.com
servers:
  - url: https://api.wildwest.com/v1
    description: Main saloon server
paths:
  /saloon/serve:
    get:
      summary: Serve a drink at the saloon
      operationId: serveDrink
      responses:
        "200":
          description: Serves you a mocktail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Mojito"
        "201":
          description: Serves you a drink (alternative response)
          content:
            application/json:
              oneOf:
                - $ref: "#/components/schemas/Mojito"
                - $ref: "#/components/schemas/Mocktail"
              examples:
                mocktailExample:
                  value:
                    id: "mocktail124"
                    spirit: "Little Saints St. Ember"
                    rocks: false
                    glass: "Collins"
  /saloon/serve/{id}:
    post:
      summary: Refill a glass
      operationId: refillGlass
      description: Refills the glass with the specified drink for a given ID.
      tags:
        - Saloon
      parameters:
        - in: path
          name: id
          required: true
          description: The ID of the drink to be refilled.
          schema:
            type: string
            example: "mocktail123"
      responses:
        "200":
          description: Serves you a mocktail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Mocktail"
  /saloon/enter:
    post:
      summary: Enter the saloon
      operationId: enterSaloon
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Cowboy"
      responses:
        "200":
          description: Successfully entered the saloon
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Response"
        "400":
          description: Invalid cowboy credentials
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  /saloon/leave:
    post:
      summary: Leave the saloon
      operationId: leaveSaloon
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Cowboy"
      responses:
        "200":
          description: Successfully left the saloon
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Response"
        "400":
          description: Cowboy not found in saloon
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  /wanted/poster:
    post:
      summary: Create a wanted poster
      operationId: createWantedPoster
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/WantedPoster"
      responses:
        "200":
          description: Wanted poster created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Response"
        "400":
          description: Invalid poster details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  /wanted/poster/{name}:
    get:
      summary: Retrieve a wanted poster for a specific outlaw
      operationId: getWantedPosterByName
      parameters:
        - in: path
          name: name
          required: true
          description: The name of the outlaw.
          schema:
            type: string
            example: "Black Jack McCoy"
      responses:
        "200":
          description: Successfully retrieved the wanted poster details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WantedPoster"
        "404":
          description: Outlaw not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  /saloon/serve/{id}/to-wanted-poster:
    post:
      summary: Create a wanted poster from the served drink details
      operationId: createWantedPosterFromDrink
      parameters:
        - in: path
          name: id
          required: true
          description: The ID of the drink served (used to associate with the cowboy).
          schema:
            type: string
            example: "mocktail123"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                cowboyName:
                  type: string
                  description: The cowboy's name derived from the served drink
                  example: "Buck 'The Kid' Anderson"
                crimes:
                  type: array
                  items:
                    type: string
                    enum:
                      - "bank-robbery"
                      - "horse-theft"
                      - "saloon-brawl"
                      - "train-heist"
                reward:
                  type: number
                  description: Reward amount in gold coins
                  example: 1000
      responses:
        "200":
          description: Successfully created a wanted poster using drink details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Response"
        "400":
          description: Invalid drink details or cowboy info
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

components:
  schemas:
    Mocktail:
      type: object
      properties:
        id:
          type: string
          description: Drink ID
        spirit:
          type: string
          description: Non-alcoholic spirit in the drink
          example: "Little Saints St. Ember"
        rocks:
          type: boolean
          description: Mocktail served on rocks
        glass:
          type: string
          description: Shape of glass
          enum: ["Martini", "Highball", "Collins", "Rocks"]

    Mojito:
      type: object
      properties:
        id:
          type: string
          description: Drink ID
        rum:
          type: boolean
          description: Includes rum
        rocks:
          type: boolean
          description: Mocktail served on rocks
        glass:
          type: string
          description: Shape of glass
          enum: ["Highball", "Collins"]
        fruit:
          type: array
          items:
            type: string
            enum: ["Orange Slices", "Strawberries", "Lime"]
        herbs:
          type: array
          items:
            type: string
            enum: ["Mint", "Marijuana"]

    Cowboy:
      type: object
      required:
        - name
        - horse
      properties:
        name:
          type: string
          description: The cowboy's name
          example: "Buck 'The Kid' Anderson"
        horse:
          type: string
          description: The name of their trusty steed
          example: "Lightning"
        skills:
          type: array
          items:
            type: string
            enum:
              - shooting
              - lassoing
              - poker
              - horseback-riding

    WantedPoster:
      type: object
      required:
        - name
        - crimes
      properties:
        name:
          type: string
          description: Name of the outlaw
          example: "Black Jack McCoy"
        crimes:
          type: array
          items:
            type: string
            enum:
              - bank-robbery
              - horse-theft
              - saloon-brawl
              - train-heist
        reward:
          type: number
          description: Reward amount in gold coins
          example: 1000

    Response:
      type: object
      properties:
        message:
          type: string
          description: Response message
          example: "Howdy partner!"
        timestamp:
          type: string
          format: date-time
          example: "2025-02-28T14:30:00Z"

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: Error code
          example: "SALOON-001"
        message:
          type: string
          description: Error message
          example: "Partner, that ain't no valid cowboy name!"

`

var specWithJustOneOf = `
openapi: 3.0.0
info:
  title: Wild West API
  version: 1.0.0
  description: Howdy partner! This here's the Wild West API, where we manage our saloon operations and keep track of our cowboys.
  contact:
    name: Sheriff API
    email: sheriff@wildwest.com
    url: https://wildwest.com
servers:
  - url: https://api.wildwest.com/v1
    description: Main saloon server
paths:
  /saloon/serve:
    get:
      summary: Serve a drink at the saloon
      operationId: serveDrink
      responses:
        "200":
          description: Serves you a mocktail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Mojito"
        "201":
          description: Serves you a drink (alternative response)
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/Mojito"
                  - $ref: "#/components/schemas/Mocktail"
              examples:
                mocktailExamples:
                  value:
                      id: "mocktail124"
                      spirit: "Little Saints St. Ember"
                      rocks: false
                      glass: "Collins"
                mocktailExample:
                  value:
                    id: "mocktail124"
                    spirit: "Little Saints St. Ember"
                    rocks: false
                    glass: "Collins"  
components:
  schemas:
    Mocktail:
      type: object
      properties:
        id:
          type: string
          description: Drink ID
        spirit:
          type: string
          description: Non-alcoholic spirit in the drink
          example: "Little Saints St. Ember"
        rocks:
          type: boolean
          description: Mocktail served on rocks
        glass:
          type: string
          description: Shape of glass
          enum: ["Martini", "Highball", "Collins", "Rocks"]
    Mojito:
      type: object
      properties:
        id:
          type: string
          description: Drink ID
        rum:
          type: boolean
          description: Includes rum
        rocks:
          type: boolean
          description: Mocktail served on rocks
        glass:
          type: string
          description: Shape of glass
          enum: ["Highball", "Collins"]
        fruit:
          type: array
          items:
            type: string
            enum: ["Orange Slices", "Strawberries", "Lime"]
        herbs:
          type: array
          items:
            type: string
            enum: ["Mint", "Marijuana"]
    Cowboy:
      type: object
      required:
        - name
        - horse
      properties:
        name:
          type: string
          description: The cowboy's name
          example: "Buck 'The Kid' Anderson"
        horse:
          type: string
          description: The name of their trusty steed
          example: "Lightning"
        skills:
          type: array
          items:
            type: string
            enum:
              - shooting
              - lassoing
              - poker
              - horseback-riding

    WantedPoster:
      type: object
      required:
        - name
        - crimes
      properties:
        name:
          type: string
          description: Name of the outlaw
          example: "Black Jack McCoy"
        crimes:
          type: array
          items:
            type: string
            enum:
              - bank-robbery
              - horse-theft
              - saloon-brawl
              - train-heist
        reward:
          type: number
          description: Reward amount in gold coins
          example: 1000

    Response:
      type: object
      properties:
        message:
          type: string
          description: Response message
          example: "Howdy partner!"
        timestamp:
          type: string
          format: date-time
          example: "2025-02-28T14:30:00Z"

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: Error code
          example: "SALOON-001"
        message:
          type: string
          description: Error message
          example: "Partner, that ain't no valid cowboy name!"
  `

// build the document once with the unresolved references, then resolve them, and collect the goods.

func testGetAllPaths(docString string) map[string]*shared.PathItem {

	d, _ := libopenapi.NewDocument([]byte(docString))
	docModel, _ := d.BuildV3Model()

	return formPathsForMockIsland(&docModel.Model)
}

func TestGetAllPaths(t *testing.T) {

	testGetAllPaths(doc)

}

func TestOneOf(t *testing.T) {

	testGetAllPaths(specWithJustOneOf)
}
