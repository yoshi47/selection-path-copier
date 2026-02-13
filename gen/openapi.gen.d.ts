// AUTO-GENERATED - DO NOT EDIT
// openapi-typescript v7.0.0

export interface paths {
    "/api/users": {
    get: operations["getUsers"];
      post: operations["createUser"];
};
  "/api/users/{id}": {
    get: operations["getUserById"];
        delete: operations["deleteUser"];
  };
}

export interface operations {
    getUsers: { responses: { 200: { content: { "application/json": components["schemas"]["User"][]; }; }; }; };
  createUser: { requestBody: { content: { "application/json": components["schemas"]["CreateUserInput"]; }; }; };
  getUserById: { parameters: { path: { id: string; }; }; };
  deleteUser: { parameters: { path: { id: string; }; }; };
}

export interface components {
    schemas: {
          User: { id: string; name: string; email: string; };
          CreateUserInput: { name: string; email: string; };
    };
}
