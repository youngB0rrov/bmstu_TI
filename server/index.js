import express from 'express';
import { resolve } from 'path';
import { __dirname } from './globals.js';
import { readData, writeData } from './fileUtils.js';

const app = express();

const hostname = 'localhost';
const port = 4321;

const tasklists = [];

// Middleware для формирования ответа в формате JSON
app.use(express.json());

// Middleware для логирования запросов
app.use((request, response, next) => {
  console.log(
    (new Date()).toISOString(),
    request.ip,
    request.method,
    request.originalUrl
  );

  next();
});

// Middleware для раздачи статики
app.use('/', express.static(
  resolve(__dirname, '..', 'public')
));

//---------------------------------------------------
// Роуты приложения

// Получение весх списков задач
app.get('/tasklists', (request, response) => {
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json(tasklists);
});

// Создание нового списка задач
app.post('/tasklists', async (request, response) => {
  console.log(request);
  const { tasklistName } = request.body;
  tasklists.push({
    tasklistName,
    tasks: []
  });
  await writeData(tasklists);

  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Tasklist '${tasklistName}' was successfully created`
    });
});

// Создание новой задачи
app.post('/tasklists/:tasklistId/tasks', async (request, response) => {
  const { taskName } = request.body;
  const tasklistId = Number(request.params.tasklistId);

  if (tasklistId < 0 || tasklistId >= tasklists.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `There is no tasklist with id = ${tasklistId}`
      });
    return;
  }

  tasklists[tasklistId].tasks.push(taskName);
  await writeData(tasklists);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Task '${taskName}' was successfully added in tasklist '${tasklists[tasklistId].tasklistName}'`
    });
});

// Изменение задачи
app.put('/tasklists/:tasklistId/tasks/:taskId', async (request, response) => {
  const { newTaskName } = request.body;
  const tasklistId = Number(request.params.tasklistId);
  const taskId = Number(request.params.taskId);

  if (tasklistId < 0 || tasklistId >= tasklists.length
    || taskId < 0 || taskId >= tasklists[tasklistId].tasks.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `There is no tasklist with id = ${
          tasklistId} or task with id = ${taskId}`
      });
    return;
  }

  tasklists[tasklistId].tasks[taskId] = newTaskName;
  await writeData(tasklists);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Task №${taskId} was successfully edited in tasklist '${tasklists[tasklistId].tasklistName}'`
    });
});

// Удаление задачи
app.delete('/tasklists/:tasklistId/tasks/:taskId', async (request, response) => {
  const tasklistId = Number(request.params.tasklistId);
  const taskId = Number(request.params.taskId);

  if (tasklistId < 0 || tasklistId >= tasklists.length
    || taskId < 0 || taskId >= tasklists[tasklistId].tasks.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `There is no tasklist with id = ${
          tasklistId} or task with id = ${taskId}`
      });
    return;
  }

  const deletedTaskName = tasklists[tasklistId].tasks[taskId];
  tasklists[tasklistId].tasks.splice(taskId, 1);
  await writeData(tasklists);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Task '${deletedTaskName}' was successfully deleted from tasklist '${tasklists[tasklistId].tasklistName}'`
    });
});

// Перенос задачи с одного спика в другой
app.patch('/tasklists/:tasklistId', async (request, response) => {
  const fromTasklistId = Number(request.params.tasklistId);
  const { toTasklistId, taskId } = request.body;

  if (fromTasklistId < 0 || fromTasklistId >= tasklists.length
    || taskId < 0 || taskId >= tasklists[fromTasklistId].tasks.length
    || toTasklistId < 0 || toTasklistId >= tasklists.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `There is no tasklist with id = ${
          fromTasklistId} of ${toTasklistId} or task with id = ${taskId}`
      });
    return;
  }

  const movedTaskName = tasklists[fromTasklistId].tasks[taskId];

  tasklists[fromTasklistId].tasks.splice(taskId, 1);
  tasklists[toTasklistId].tasks.push(movedTaskName);

  await writeData(tasklists);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Task '${movedTaskName}' was successfully moved from tasklist '${tasklists[fromTasklistId].tasklistName}' to tasklist '${
        tasklists[toTasklistId].tasklistName
      }'`
    });
}); 

//---------------------------------------------------

// Запуск сервера
app.listen(port, hostname, async (err) => {
  if (err) {
    console.error('Error: ', err);
    return;
  }

  console.log(`Out server started at http://${hostname}:${port}`);

  const tasklistsFromFile = await readData();
  tasklistsFromFile.forEach(({ tasklistName, tasks }) => {
    tasklists.push({
      tasklistName,
      tasks: [...tasks]
    });
  });
});
