package trafficControl

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"testing"

	"github.com/pb33f/libopenapi"
	"github.com/pb33f/libopenapi/index"
	"gopkg.in/yaml.v3"
)

var doc = `
openapi: 3.0.3
info:
  title: Swagger Petstore - OpenAPI 3.0
  description: Modifies the standard Petstore example to illustrate a workflow in which coupons are discovered and then used in an order.
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  version: 1.0.0
tags:
  - name: pet
    description: Everything about your Pets
    externalDocs:
      description: Find out more
      url: http://swagger.io
  - name: store
    description: Access to Petstore orders
    externalDocs:
      description: Find out more about our store
      url: http://swagger.io
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: Update an existing pet by Id
      operationId: updatePet
      requestBody:
        description: Update an existent pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
          application/xml:
            schema:
              $ref: '#/components/schemas/Pet'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'          
            application/xml:
              schema:
                $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid ID supplied
        '404':
          description: Pet not found
        '405':
          description: Validation exception
      security:
        - petstore_auth:
            - write:pets
            - read:pets
    post:
      tags:
        - pet
      summary: Add a new pet to the store
      description: Add a new pet to the store
      operationId: addPet
      requestBody:
        description: Create a new pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
          application/xml:
            schema:
              $ref: '#/components/schemas/Pet'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'          
            application/xml:
              schema:
                $ref: '#/components/schemas/Pet'
        '405':
          description: Invalid input
      security:
        - petstore_auth:
            - write:pets
            - read:pets
  /pet/findByStatus:
    get:
      tags:
        - pet
      summary: Finds Pets by status
      description: Multiple status values can be provided with comma separated strings
      operationId: findPetsByStatus
      parameters:
        - name: status
          in: query
          description: Status values that need to be considered for filter
          required: false
          explode: true
          schema:
            type: string
            default: available
            enum:
              - available
              - pending
              - sold
        - name: page
          in: query
          description: Which page of results to display. First page is 1.
          required: true
          schema:
            type: integer
            format: int32
        - name: pageSize
          in: query
          description: Number of results to display per page.
          required: false
          schema:
            type: integer
            format: int32
            default: 10
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'          
            application/xml:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid status value
      security:
        - petstore_auth:
            - write:pets
            - read:pets
  /pet/findByTags:
    get:
      tags:
        - pet
      summary: Finds Pets by tags
      description: Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
      operationId: findPetsByTags
      parameters:
        - name: tags
          in: query
          description: Tags to filter by
          required: false
          explode: true
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'          
            application/xml:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid tag value
      security:
        - petstore_auth:
            - write:pets
            - read:pets
  /pet/{petId}:
    get:
      tags:
        - pet
      summary: Find pet by ID
      description: Returns a single pet
      operationId: getPetById
      parameters:
        - name: petId
          in: path
          description: ID of pet to return
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'          
            application/xml:
              schema:
                $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid ID supplied
        '404':
          description: Pet not found
      security:
        - api_key: []
        - petstore_auth:
            - write:pets
            - read:pets
    post:
      tags:
        - pet
      summary: Updates a pet in the store with form data
      description: ''
      operationId: updatePetWithForm
      parameters:
        - name: petId
          in: path
          description: ID of pet that needs to be updated
          required: true
          schema:
            type: integer
            format: int64
        - name: name
          in: query
          description: Name of pet that needs to be updated
          schema:
            type: string
        - name: status
          in: query
          description: Status of pet that needs to be updated
          schema:
            type: string
      responses:
        '405':
          description: Invalid input
      security:
        - petstore_auth:
            - write:pets
            - read:pets
    delete:
      tags:
        - pet
      summary: Deletes a pet
      description: delete a pet
      operationId: deletePet
      parameters:
        - name: api_key
          in: header
          description: ''
          required: false
          schema:
            type: string
        - name: petId
          in: path
          description: Pet id to delete
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '400':
          description: Invalid pet value
      security:
        - petstore_auth:
            - write:pets
            - read:pets
  /pet/{petId}/coupons:
    get:
      tags:
        - pet
      summary: Find a coupon available for a pet
      description: Returns a coupon available for the pet, if applicable
      operationId: getPetCoupons
      parameters:
        - name: petId
          in: path
          description: ID of pet with available coupons
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Coupon'          
            application/xml:
              schema:
                $ref: '#/components/schemas/Coupon'
        '400':
          description: Invalid ID supplied
        '404':
          description: Pet not found or coupon not available
      security:
        - api_key: []
        - petstore_auth:
            - read:pets
  /store/order:
    post:
      tags:
        - store
      summary: Place an order for a pet
      description: Place a new order in the store
      operationId: placeOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
          application/xml:
            schema:
              $ref: '#/components/schemas/Order'
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid input
  /store/order/{orderId}:
    get:
      tags:
        - store
      summary: Find purchase order by ID
      description: For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.
      operationId: getOrderById
      parameters:
        - name: orderId
          in: path
          description: ID of order that needs to be fetched
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'          
            application/xml:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid ID supplied
        '404':
          description: Order not found
    delete:
      tags:
        - store
      summary: Delete purchase order by ID
      description: For valid response try integer IDs with value < 1000. Anything above 1000 or nonintegers will generate API errors
      operationId: deleteOrder
      parameters:
        - name: orderId
          in: path
          description: ID of the order that needs to be deleted
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '400':
          description: Invalid ID supplied
        '404':
          description: Order not found
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        petId:
          type: integer
          format: int64
          example: 198772
        quantity:
          type: integer
          format: int32
          example: 7
        status:
          type: string
          description: Order Status
          example: approved
          enum:
            - placed
            - approved
            - delivered
        complete:
          type: boolean
        couponCode:
          type: string
          example: "SUMMERSALE"
      xml:
        name: order
    Category:
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 1
        name:
          type: string
          example: Dogs
      xml:
        name: category
    Tag:
      type: object
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
      xml:
        name: tag
    Pet:
      required:
        - name
        - price
        - photoUrls
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
        category:
          $ref: '#/components/schemas/Category'
        photoUrls:
          type: array
          xml:
            wrapped: true
          items:
            type: string
            xml:
              name: photoUrl
        price:
          type: number
        tags:
          type: array
          xml:
            wrapped: true
          items:
            $ref: '#/components/schemas/Tag'
        status:
          type: string
          description: pet status in the store
          enum:
            - available
            - pending
            - sold
      xml:
        name: pet
    ApiResponse:
      type: object
      properties:
        code:
          type: integer
          format: int32
        type:
          type: string
        message:
          type: string
      xml:
        name: '##default'
    Coupon:
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        description:
          type: string
          example: "Summer Sale - 10% off!"
        couponCode:
          type: string
          example: "SUMMERSALE"
      xml:
        name: coupon
  requestBodies:
    Pet:
      description: Pet object that needs to be added to the store
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Pet'
        application/xml:
          schema:
            $ref: '#/components/schemas/Pet'
  securitySchemes:
    petstore_auth:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: https://petstore3.swagger.io/oauth/authorize
          scopes:
            write:pets: modify pets in your account
            read:pets: read your pets
    api_key:
      type: apiKey
      name: api_key
      in: header`

// read the Digital Ocean OpenAPI Specification from Github.
func read() []byte {
	res, err := http.Get("https://raw.githubusercontent.com/digitalocean" +
		"/openapi/main/specification/DigitalOcean-public.v2.yaml")
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}
	return data
}

// Index the digital ocean OpenAPI specification
func digitalOcean() {

	// create a root node to unmarshal the spec into.
	var rootNode yaml.Node
	_ = yaml.Unmarshal(read(), &rootNode)

	// create a new config that allows remote lookups.
	indexConfig := index.CreateOpenAPIIndexConfig()

	// we're going to check for circular references later, so we don't want to do it now.
	indexConfig.AvoidCircularReferenceCheck = true

	// create a custom logger (optional)
	indexConfig.Logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	// define the base URL for the remote filesystem.
	location := "https://raw.githubusercontent.com/digitalocean/openapi/refs/heads/main/specification/DigitalOcean-public.v2.yaml"
	baseURL, _ := url.Parse(location)

	// set the base URL for the remote filesystem in the config.
	indexConfig.BaseURL = baseURL

	// create a new rolodex
	rolodex := index.NewRolodex(indexConfig)

	// set the rolodex root node to the root node of the spec.
	rolodex.SetRootNode(&rootNode)

	// create a new remote fs and set the config for indexing.
	remoteFS, _ := index.NewRemoteFSWithConfig(indexConfig)

	// add remote filesystem
	rolodex.AddRemoteFS(location, remoteFS)

	// index the rolodex
	indexedErr := rolodex.IndexTheRolodex()
	if indexedErr != nil {
		panic(indexedErr)
	}

	// get all the files!
	files := remoteFS.GetFiles()
	fileLen := len(files)

	// check for circular references across the entire document.
	rolodex.CheckForCircularReferences()

	fmt.Printf("%d files found and %d errors reported. There were %d circular references found.\n",
		fileLen, len(remoteFS.GetErrors()), len(rolodex.GetCaughtErrors()))

	// extrtact the resolver from the root index.
	resolver := rolodex.GetRootIndex().GetResolver()

	// print out some interesting information discovered when visiting all the references.
	fmt.Printf("%d references visited\n", resolver.GetReferenceVisited())
	fmt.Printf("%d journeys taken\n", resolver.GetJourneysTaken())
	fmt.Printf("%d index visits\n", resolver.GetIndexesVisited())
	fmt.Printf("%d relatives seen\n", resolver.GetRelativesSeen())
}

func testGetAllPaths() map[string]*PathItem {

	d, _ := libopenapi.NewDocument([]byte(doc))
	docModel, _ := d.BuildV3Model()

	// create a new config that does not allow lookups.
	indexConfig := index.CreateClosedAPIIndexConfig()

	// create a new rolodex
	rolodex := index.NewRolodex(indexConfig)

	// * the rolodex is so fucking powerful, what the actual fuck
	rolodex.SetRootNode(docModel.Index.GetRootNode())
	rolodex.IndexTheRolodex()

	refrences := rolodex.GetAllReferences()

	rolodex.Resolve()

	resolver := rolodex.GetRootIndex().GetResolver()

	// print out some interesting information discovered when visiting all the references.
	fmt.Printf("%d errors repored\n", len(rolodex.GetCaughtErrors()))
	fmt.Printf("%d references visited\n", resolver.GetReferenceVisited())
	fmt.Printf("%d journeys taken\n", resolver.GetJourneysTaken())
	fmt.Printf("%d index visits\n", resolver.GetIndexesVisited())
	fmt.Printf("%d relatives seen\n", resolver.GetRelativesSeen())

	fmt.Println(refrences)

	resolvedSchemas := make(map[string]string)

	return formPathsForMockIsland(&docModel.Model, rolodex, resolvedSchemas)
}

func TestGetAllPaths(t *testing.T) {
	digitalOcean()

	testGetAllPaths()

}
