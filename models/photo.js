"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Photo extends Model {
    static associate(models) {}
  }

  Photo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      filter: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [["none", "sepia", "grayscale", "vintage", "warm", "cool"]],
            msg: "Недопустимый фильтр. Разрешены: none, sepia, grayscale, vintage, warm, cool",
          },
        },
      },
      album: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      likes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Photo",
      tableName: "Photos",
    },
  );

  return Photo;
};
