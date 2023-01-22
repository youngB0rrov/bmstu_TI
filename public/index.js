document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

class AppModel {
  static async getTasklists() {
    const tasklistsRes = await fetch('http://localhost:4321/tasklists');
    return await tasklistsRes.json();
  }

  static async addTasklist(tasklistName) {
    const result = await fetch(
      'http://localhost:4321/tasklists',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tasklistName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async addTask({
    tasklistId,
    taskName
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async editTask({
    tasklistId,
    taskId,
    newTaskName
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newTaskName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async deleteTask({
    tasklistId,
    taskId
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks/${taskId}`,
      {
        method: 'DELETE'
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async moveTask({
    fromTasklistId,
    toTasklistId,
    taskId
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${fromTasklistId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toTasklistId, taskId })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }
}

class App {
  constructor() {
    this.tasklists = [];
  }

  onEscapeKeydown = ({ key }) => {
    if (key === 'Escape') {
      const input = document.getElementById('add-tasklist-input');
      input.style.display = 'none';
      input.value = '';

      document.getElementById('tm-tasklist-add-tasklist')
        .style.display = 'inherit';
    }
  };

  onInputKeydown = async ({ key, target }) => {
    if (key === 'Enter') {
      if (target.value) {
        await AppModel.addTasklist(target.value);

        this.tasklists.push(
          new Tasklist({
            tlName: target.value,
            tlID: `TL${this.tasklists.length}`,
            moveTask: this.moveTask
          })
        );

        this.tasklists[this.tasklists.length - 1].render();
      }
      
      target.style.display = 'none';
      target.value = '';

      document.getElementById('tm-tasklist-add-tasklist')
        .style.display = 'inherit';
    }
  };

  moveTask = async ({ taskID, direction }) => {
    let [
      tlIndex,
      taskIndex
    ] = taskID.split('-T');
    tlIndex = Number(tlIndex.split('TL')[1]);
    taskIndex = Number(taskIndex);
    const taskName = this.tasklists[tlIndex].tasks[taskIndex];
    const targetTlIndex = direction === 'left'
      ? tlIndex - 1
      : tlIndex + 1;

    try {
      await AppModel.moveTask({
        fromTasklistId: tlIndex,
        toTasklistId: targetTlIndex,
        taskId: taskIndex
      });

      this.tasklists[tlIndex].deleteTask(taskIndex);
      this.tasklists[targetTlIndex].addTask(taskName);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  async init() {
    const tasklists = await AppModel.getTasklists();
    tasklists.forEach(({ tasklistName, tasks }) => {
      const newTasklist = new Tasklist({
        tlName: tasklistName,
        tlID: `TL${this.tasklists.length}`,
        moveTask: this.moveTask
      });
      tasks.forEach(task => newTasklist.tasks.push(task));
      
      this.tasklists.push(newTasklist);
      newTasklist.render();
      newTasklist.rerenderTasks();
    });

    document.getElementById('tm-tasklist-add-tasklist')
      .addEventListener(
        'click',
        (event) => {
          event.target.style.display = 'none';

          const input = document.getElementById('add-tasklist-input');
          input.style.display = 'inherit';
          input.focus();
        }
      );

    document.addEventListener('keydown', this.onEscapeKeydown);

    document.getElementById('add-tasklist-input')
      .addEventListener('keydown', this.onInputKeydown);

    document.querySelector('.toggle-switch input')
      .addEventListener(
        'change',
        ({ target: { checked } }) => {
          checked
            ? document.body.classList.add('dark-theme')
            : document.body.classList.remove('dark-theme');
        }
      );
  }
}

class Tasklist {
  constructor({
    tlName,
    tlID,
    moveTask
  }) {
    this.tlName = tlName;
    this.tlID = tlID;
    this.tasks = [];
    this.moveTask = moveTask;
  }

  onAddTaskButtonClick = async () => {
    const newTaskName = prompt('Введите название товара, который будет лежать на новом стиллаже:');

    if (!newTaskName) return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.addTask({
        tasklistId,
        taskName: newTaskName
      });
      this.addTask(newTaskName);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  addTask = (taskName) => {
    document.querySelector(`#${this.tlID} ul`)
      .appendChild(
        this.renderTask({
          taskID: `${this.tlID}-T${this.tasks.length}`,
          taskName
        })
      );

    this.tasks.push(taskName);
  };

  onEditTask = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const oldTaskName = this.tasks[taskIndex];

    const newTaskName = prompt('Введите новое описание товара', oldTaskName);

    if (!newTaskName || newTaskName === oldTaskName) {
      return;
    }

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.editTask({
        tasklistId,
        taskId: taskIndex,
        newTaskName
      });

      this.tasks[taskIndex] = newTaskName;
      document.querySelector(`#${taskID} span`)
        .innerHTML = newTaskName;
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  onDeleteTaskButtonClick = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const taskName = this.tasks[taskIndex];

    if (!confirm(`Товар '${taskName}' будет удален со стеллажа. Продолжить?`)) return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.deleteTask({
        tasklistId,
        taskId: taskIndex
      });

      this.deleteTask(taskIndex);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  deleteTask = (taskIndex) => {
    this.tasks.splice(taskIndex, 1);
    this.rerenderTasks();
  };

  rerenderTasks = () => {
    const tasklist = document.querySelector(`#${this.tlID} ul`);
    tasklist.innerHTML = '';

    this.tasks.forEach((taskName, taskIndex) => {
      tasklist.appendChild(
        this.renderTask({
          taskID: `${this.tlID}-T${taskIndex}`,
          taskName
        })
      );
    });
  };

  renderTask = ({ taskID, taskName }) => {
    const task = document.createElement('li');
    task.classList.add('tm-tasklist-task');
    task.id = taskID;

    const span = document.createElement('span');
    span.classList.add('tm-tasklist-task-text');
    span.innerHTML = taskName;
    task.appendChild(span);

    const controls = document.createElement('div');
    controls.classList.add('tm-tasklist-task-controls');

    const upperRow = document.createElement('div');
    upperRow.classList.add('tm-tasklist-task-controls-row');

    const leftArrow = document.createElement('button');
    leftArrow.type = 'button';
    leftArrow.classList.add(
      'tm-tasklist-task-controls-button',
      'left-arrow'
    );
    leftArrow.addEventListener(
      'click',
      () => this.moveTask({ taskID, direction: 'left' })
    );
    upperRow.appendChild(leftArrow);

    const rightArrow = document.createElement('button');
    rightArrow.type = 'button';
    rightArrow.classList.add(
      'tm-tasklist-task-controls-button',
      'right-arrow'
    );
    rightArrow.addEventListener(
      'click',
      () => this.moveTask({ taskID, direction: 'right' })
    );
    upperRow.appendChild(rightArrow);

    controls.appendChild(upperRow);

    const lowerRow = document.createElement('div');
    lowerRow.classList.add('tm-tasklist-task-controls-row');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.classList.add(
      'tm-tasklist-task-controls-button',
      'edit-icon'
    );
    editButton.addEventListener('click', () => this.onEditTask(taskID));
    lowerRow.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add(
      'tm-tasklist-task-controls-button',
      'delete-icon'
    );
    deleteButton.addEventListener('click', () => this.onDeleteTaskButtonClick(taskID));
    lowerRow.appendChild(deleteButton);

    controls.appendChild(lowerRow);

    task.appendChild(controls);

    return task;
  };

  render() {
    const tasklist = document.createElement('div');
    tasklist.classList.add('tm-tasklist');
    tasklist.id = this.tlID;

    const header = document.createElement('header');
    header.classList.add('tm-tasklist-header');
    header.innerHTML = this.tlName;
    tasklist.appendChild(header);

    const list = document.createElement('ul');
    list.classList.add('tm-tasklist-tasks');
    tasklist.appendChild(list);

    const footer = document.createElement('footer');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('tm-tasklist-add-task');
    button.innerHTML = 'Положить товар';
    button.addEventListener('click', this.onAddTaskButtonClick);
    footer.appendChild(button);
    tasklist.appendChild(footer);

    const container = document.querySelector('main');
    container.insertBefore(tasklist, container.lastElementChild);
  }
}
