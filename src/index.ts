import { Elysia } from "elysia"
import { z } from "zod"

// domain layer
const todoSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(100),
  completed: z.boolean(),
})
type Todo = z.infer<typeof todoSchema>

const addTodoRequestBodySchema = z.object({
  title: todoSchema.shape.title,
})

type AddTodoRequestBody = z.infer<typeof addTodoRequestBodySchema>

type TodoRepository = {
  findAll: () => Todo[]
  findById: (id: Todo["id"]) => Todo | undefined
  save: (todo: Todo) => Todo
  update: (todo: Todo) => Todo
}

// infrastcutre layer
const todos: Todo[] = []
const todoRepository: TodoRepository = {
  findAll: () => todos,
  findById: (id: Todo["id"]) => {
    // find todo by id
    return todos.find((t) => t.id === id)
  },
  save: (todo: Todo) => {
    // save todo
    todos.push(todo)

    return todo
  },
  update: (todo: Todo) => {
    // update todo
    const index = todos.findIndex((t) => t.id === todo.id)
    todos[index] = todo

    return todo
  },
}

// usecase layer
const getAllTodos = (repository: TodoRepository) => {
  return repository.findAll()
}

const addTodo = (repository: TodoRepository) => {
  return (todo: Todo) => {
    return repository.save(todo)
  }
}

const app = new Elysia()
  .get("/ping", () => {
    return "pong"
  })
  .get("/todos", () => {
    return getAllTodos(todoRepository)
  })
  .post("/todos", (ctx) => {
    const todos = getAllTodos(todoRepository)

    const check = addTodoRequestBodySchema.safeParse(ctx.body)

    if (!check.success) {
      ctx.set.status = 400
      return
    }

    const todo: Todo = {
      id: todos.length + 1,
      title: check.data.title,
      completed: false,
    }

    return addTodo(todoRepository)(todo)
  })
  .put("/todos/:id", (ctx) => {
    const id = z.coerce.number().safeParse(ctx.params.id)

    if (!id.success) {
      ctx.set.status = 400
      return
    }

    const todo = todoRepository.findById(id.data)

    if (!todo) {
      ctx.set.status = 404
      return
    }

    const requestBody = todoSchema.safeParse(ctx.body)

    if (!requestBody.success) {
      console.error("request body is invalid", requestBody.error)
      ctx.set.status = 400
      return
    }

    return todoRepository.update({
      ...todo,
      ...requestBody.data,
    })
  })
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
