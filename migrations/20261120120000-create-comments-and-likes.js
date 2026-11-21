"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Comments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      photoId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Photos", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      text: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex("Comments", ["photoId"]);

    await queryInterface.createTable("PhotoLikes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      photoId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Photos", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    // один пользователь — один лайк на фото
    await queryInterface.addIndex("PhotoLikes", ["photoId", "userId"], {
      unique: true,
      name: "photolikes_photo_user_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PhotoLikes");
    await queryInterface.dropTable("Comments");
  },
};
